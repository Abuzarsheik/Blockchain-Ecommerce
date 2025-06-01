const Order = require('../models/Order');
const Product = require('../models/Product');
const Review = require('../models/Review');
const User = require('../models/User');
const notificationService = require('./notificationService');

class ReviewService {
  // Get reviews for a product with statistics
  async getProductReviews(productId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = 'newest',
        filterRating = null,
        includeImages = false
      } = options;

      const skip = (page - 1) * limit;
      const filter = { product_id: productId, status: 'approved' };

      if (filterRating) {
        filter.product_rating = filterRating;
      }

      if (includeImages) {
        filter['images.0'] = { $exists: true };
      }

      // Build sort criteria
      let sort = {};
      switch (sortBy) {
        case 'newest':
          sort = { created_at: -1 };
          break;
        case 'oldest':
          sort = { created_at: 1 };
          break;
        case 'rating-high':
          sort = { product_rating: -1 };
          break;
        case 'rating-low':
          sort = { product_rating: 1 };
          break;
        case 'helpful':
          sort = { 'helpful_votes.up': -1 };
          break;
        default:
          sort = { created_at: -1 };
      }

      const reviews = await Review.find(filter)
        .populate('user_id', 'firstName lastName profile')
        .populate('product_id', 'name images')
        .populate('seller_id', 'firstName lastName businessName')
        .sort(sort)
        .skip(skip)
        .limit(limit);

      const totalCount = await Review.countDocuments(filter);
      const statistics = await this.calculateProductStatistics(productId);

      return {
        reviews,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        statistics
      };
    } catch (error) {
      logger.error('Get product reviews error:', error);
      throw error;
    }
  }

  // Calculate comprehensive product review statistics
  async calculateProductStatistics(productId) {
    try {
      const stats = await Review.aggregate([
        { $match: { product_id: productId, status: 'approved' } },
        {
          $group: {
            _id: null,
            totalReviews: { $sum: 1 },
            averageRating: { $avg: '$product_rating' },
            averageSellerRating: { $avg: '$seller_rating' },
            verifiedPurchases: {
              $sum: { $cond: ['$verified_purchase', 1, 0] }
            },
            ratingDistribution: {
              $push: '$product_rating'
            },
            aspectQuality: { $avg: '$aspects.quality' },
            aspectValue: { $avg: '$aspects.value' },
            aspectShipping: { $avg: '$aspects.shipping' },
            aspectPackaging: { $avg: '$aspects.packaging' },
            aspectCommunication: { $avg: '$aspects.communication' }
          }
        }
      ]);

      if (!stats.length) {
        return {
          totalReviews: 0,
          averageRating: 0,
          averageSellerRating: 0,
          verifiedPurchasePercentage: 0,
          recommendationPercentage: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          aspectRatings: {}
        };
      }

      const result = stats[0];
      
      // Calculate rating distribution
      const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      result.ratingDistribution.forEach(rating => {
        distribution[rating] = (distribution[rating] || 0) + 1;
      });

      // Calculate recommendation percentage (4+ stars)
      const recommendCount = result.ratingDistribution.filter(rating => rating >= 4).length;
      const recommendationPercentage = result.totalReviews > 0 
        ? Math.round((recommendCount / result.totalReviews) * 100) 
        : 0;

      // Calculate verified purchase percentage
      const verifiedPurchasePercentage = result.totalReviews > 0
        ? Math.round((result.verifiedPurchases / result.totalReviews) * 100)
        : 0;

      // Build aspect ratings
      const aspectRatings = {};
      if (result.aspectQuality) {
        aspectRatings.quality = { average: result.aspectQuality };
      }
      if (result.aspectValue) {
        aspectRatings.value = { average: result.aspectValue };
      }
      if (result.aspectShipping) {
        aspectRatings.shipping = { average: result.aspectShipping };
      }
      if (result.aspectPackaging) {
        aspectRatings.packaging = { average: result.aspectPackaging };
      }
      if (result.aspectCommunication) {
        aspectRatings.communication = { average: result.aspectCommunication };
      }

      return {
        totalReviews: result.totalReviews,
        averageRating: result.averageRating,
        averageSellerRating: result.averageSellerRating,
        verifiedPurchasePercentage,
        recommendationPercentage,
        ratingDistribution: distribution,
        aspectRatings
      };
    } catch (error) {
      logger.error('Calculate product statistics error:', error);
      throw error;
    }
  }

  // Get eligible orders for review
  async getEligibleOrders(userId) {
    try {
      const orders = await Order.find({
        user_id: userId,
        status: 'delivered',
        review_submitted: { $ne: true }
      })
      .populate('items.product_id', 'name images')
      .sort({ created_at: -1 });

      return orders;
    } catch (error) {
      logger.error('Get eligible orders error:', error);
      throw error;
    }
  }

  // Check if user can review a product
  async canUserReviewProduct(userId, productId) {
    try {
      // Check if user has purchased this product
      const order = await Order.findOne({
        user_id: userId,
        'items.product_id': productId,
        status: 'delivered'
      });

      if (!order) {
        return { canReview: false, reason: 'No completed purchase found' };
      }

      // Check if already reviewed
      const existingReview = await Review.findOne({
        user_id: userId,
        product_id: productId
      });

      if (existingReview) {
        return { canReview: false, reason: 'Already reviewed' };
      }

      return { canReview: true, orderId: order._id };
    } catch (error) {
      logger.error('Check user review eligibility error:', error);
      throw error;
    }
  }

  // Create a new review
  async createReview(reviewData, userId) {
    try {
      // Validate order and eligibility
      const order = await Order.findById(reviewData.orderId);
      if (!order || order.user_id.toString() !== userId) {
        throw new Error('Invalid order or unauthorized');
      }

      if (order.status !== 'delivered') {
        throw new Error('Order must be delivered to leave a review');
      }

      // Check for existing review
      const existingReview = await Review.findOne({
        user_id: userId,
        product_id: reviewData.productId
      });

      if (existingReview) {
        throw new Error('You have already reviewed this product');
      }

      // Get product and seller info
      const product = await Product.findById(reviewData.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      // Create review
      const review = new Review({
        product_id: reviewData.productId,
        order_id: reviewData.orderId,
        user_id: userId,
        seller_id: product.user_id,
        product_rating: reviewData.productRating,
        product_review: reviewData.productReview,
        seller_rating: reviewData.sellerRating,
        seller_review: reviewData.sellerReview,
        aspects: reviewData.aspects || {},
        images: reviewData.images || [],
        verified_purchase: true,
        status: 'approved' // Auto-approve for now, can add moderation later
      });

      await review.save();

      // Mark order as reviewed
      await Order.findByIdAndUpdate(reviewData.orderId, {
        review_submitted: true
      });

      // Update product rating cache
      await this.updateProductRating(reviewData.productId);

      // Send notifications
      await this.sendReviewNotifications(review);

      // Populate review data for response
      await review.populate('user_id', 'firstName lastName profile');
      await review.populate('product_id', 'name images');
      await review.populate('seller_id', 'firstName lastName businessName');

      return review;
    } catch (error) {
      logger.error('Create review error:', error);
      throw error;
    }
  }

  // Update product rating cache
  async updateProductRating(productId) {
    try {
      const stats = await this.calculateProductStatistics(productId);
      
      await Product.findByIdAndUpdate(productId, {
        'ratings.average': stats.averageRating || 0,
        'ratings.count': stats.totalReviews || 0
      });
    } catch (error) {
      logger.error('Update product rating error:', error);
    }
  }

  // Send review-related notifications
  async sendReviewNotifications(review) {
    try {
      // Notify seller of new review
      await notificationService.sendNotification(
        review.seller_id,
        'review_received',
        {
          productName: review.product_id?.name,
          rating: review.product_rating,
          reviewId: review._id
        },
        {
          actionUrl: `/products/${review.product_id}#reviews`,
          actionText: 'View Review'
        }
      );

      // If review is 4+ stars, notify seller of positive feedback
      if (review.product_rating >= 4) {
        await notificationService.sendNotification(
          review.seller_id,
          'positive_review',
          {
            productName: review.product_id?.name,
            rating: review.product_rating,
            customerName: `${review.user_id?.firstName} ${review.user_id?.lastName}`
          }
        );
      }
    } catch (error) {
      logger.error('Send review notifications error:', error);
    }
  }

  // Add seller response to review
  async addSellerResponse(reviewId, sellerId, content) {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.seller_id.toString() !== sellerId) {
        throw new Error('Unauthorized to respond to this review');
      }

      const isEdit = Boolean(review.seller_response?.content);

      review.seller_response = {
        content: content.trim(),
        responded_at: isEdit ? review.seller_response.responded_at : new Date(),
        edited_at: new Date()
      };

      await review.save();

      // Notify customer of seller response
      await notificationService.sendNotification(
        review.user_id,
        'seller_response',
        {
          productName: review.product_id?.name,
          sellerName: review.seller_id?.businessName || 
                     `${review.seller_id?.firstName} ${review.seller_id?.lastName}`,
          responseContent: content
        },
        {
          actionUrl: `/products/${review.product_id}#reviews`,
          actionText: 'View Response'
        }
      );

      return review;
    } catch (error) {
      logger.error('Add seller response error:', error);
      throw error;
    }
  }

  // Vote on review helpfulness
  async voteHelpful(reviewId, userId, voteType) {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      if (review.user_id.toString() === userId) {
        throw new Error('Cannot vote on your own review');
      }

      // Initialize helpful_votes if not exists
      if (!review.helpful_votes) {
        review.helpful_votes = { up: 0, down: 0, voters: [] };
      }

      // Check if user already voted
      const existingVoteIndex = review.helpful_votes.voters.findIndex(
        voter => voter.user_id.toString() === userId
      );

      if (existingVoteIndex !== -1) {
        const existingVote = review.helpful_votes.voters[existingVoteIndex];
        
        // Remove previous vote count
        if (existingVote.vote === 'up') {
          review.helpful_votes.up = Math.max(0, review.helpful_votes.up - 1);
        } else {
          review.helpful_votes.down = Math.max(0, review.helpful_votes.down - 1);
        }

        // Update or remove vote
        if (existingVote.vote === voteType) {
          // Remove vote if same type
          review.helpful_votes.voters.splice(existingVoteIndex, 1);
        } else {
          // Change vote type
          review.helpful_votes.voters[existingVoteIndex] = {
            user_id: userId,
            vote: voteType,
            voted_at: new Date()
          };
          
          // Add new vote count
          if (voteType === 'up') {
            review.helpful_votes.up++;
          } else {
            review.helpful_votes.down++;
          }
        }
      } else {
        // Add new vote
        review.helpful_votes.voters.push({
          user_id: userId,
          vote: voteType,
          voted_at: new Date()
        });

        if (voteType === 'up') {
          review.helpful_votes.up++;
        } else {
          review.helpful_votes.down++;
        }
      }

      await review.save();

      return {
        helpful_votes: review.helpful_votes,
        userVote: review.helpful_votes.voters.find(
          voter => voter.user_id.toString() === userId
        )?.vote || null
      };
    } catch (error) {
      logger.error('Vote helpful error:', error);
      throw error;
    }
  }

  // Report a review
  async reportReview(reviewId, userId, reason, details) {
    try {
      const review = await Review.findById(reviewId);
      if (!review) {
        throw new Error('Review not found');
      }

      // Initialize reports array if not exists
      if (!review.reports) {
        review.reports = [];
      }

      // Check if user already reported
      const existingReport = review.reports.find(
        report => report.reported_by.toString() === userId
      );

      if (existingReport) {
        throw new Error('You have already reported this review');
      }

      // Add report
      review.reports.push({
        reported_by: userId,
        reason,
        details: details || '',
        reported_at: new Date()
      });

      // If multiple reports, flag for admin review
      if (review.reports.length >= 3) {
        review.status = 'flagged';
      }

      await review.save();

      // Notify admin if flagged
      if (review.status === 'flagged') {
        // Add admin notification logic here
      }

      return { message: 'Review reported successfully' };
    } catch (error) {
      logger.error('Report review error:', error);
      throw error;
    }
  }

  // Get user's reviews
  async getUserReviews(userId, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const skip = (page - 1) * limit;

      const reviews = await Review.find({ user_id: userId })
        .populate('product_id', 'name images')
        .populate('seller_id', 'firstName lastName businessName')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      const totalCount = await Review.countDocuments({ user_id: userId });

      return {
        reviews,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      };
    } catch (error) {
      logger.error('Get user reviews error:', error);
      throw error;
    }
  }

  // Get seller's reviews (for products they sell)
  async getSellerReviews(sellerId, options = {}) {
    try {
      const { page = 1, limit = 10, needsResponse = false } = options;
      const skip = (page - 1) * limit;

      const filter = { seller_id: sellerId };
      if (needsResponse) {
        filter['seller_response.content'] = { $exists: false };
      }

      const reviews = await Review.find(filter)
        .populate('user_id', 'firstName lastName profile')
        .populate('product_id', 'name images')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);

      const totalCount = await Review.countDocuments(filter);

      return {
        reviews,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      };
    } catch (error) {
      logger.error('Get seller reviews error:', error);
      throw error;
    }
  }
}

module.exports = new ReviewService(); 