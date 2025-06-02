import React, { useState, useEffect, useCallback } from 'react';
import ReviewList from '../Reviews/ReviewList';
import SellerResponseForm from '../Reviews/SellerResponseForm';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { api } from '../../services/api';
import { useSelector } from 'react-redux';
import { Star, ThumbsUp, ThumbsDown, Flag, MessageCircle, User } from 'lucide-react';
import { logger } from '../../utils/logger';

const ProductReviews = ({ productId, sellerId }) => {
  const { user } = useSelector((state) => state.auth);
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [respondingToReview, setRespondingToReview] = useState(null);
  const [userEligibleToReview, setUserEligibleToReview] = useState(false);

  useEffect(() => {
    if (productId) {
      loadReviews();
      checkReviewEligibility();
    }
  }, [productId, user]);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/reviews/product/${productId}`);
      if (response.data.success) {
        setReviews(response.data.reviews);
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      logger.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkReviewEligibility = async () => {
    if (!user) {
      setUserEligibleToReview(false);
      return;
    }

    try {
      const response = await api.get(`/reviews/can-review/${productId}`);
      if (response.data.success) {
        setUserEligibleToReview(response.data.canReview);
      }
    } catch (error) {
      logger.error('Failed to check review eligibility:', error);
      setUserEligibleToReview(false);
    }
  };

  const handleRespondToReview = (review) => {
    setRespondingToReview(review);
  };

  const handleResponseSubmitted = (updatedReview) => {
    setReviews(prev => prev.map(review => 
      review.id === updatedReview.id ? updatedReview : review
    ));
    setRespondingToReview(null);
  };

  const handleCancelResponse = () => {
    setRespondingToReview(null);
  };

  const renderRatingBreakdown = () => {
    if (!statistics?.aspectRatings) return null;

    return (
      <div className="space-y-3">
        <h4 className="font-medium">Rating Breakdown</h4>
        {Object.entries(statistics.aspectRatings).map(([aspect, data]) => (
          <div key={aspect} className="flex items-center justify-between">
            <span className="text-sm font-medium capitalize">{aspect}</span>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map(star => (
                  <span
                    key={star}
                    className={`text-sm ${
                      star <= Math.round(data.average) ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm text-gray-600">
                {data.average.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderQuickStats = () => {
    if (!statistics) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {statistics.recommendationPercentage || 0}%
          </div>
          <p className="text-xs text-gray-600">Recommend</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {statistics.averageRating?.toFixed(1) || 0}
          </div>
          <p className="text-xs text-gray-600">Avg Rating</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {statistics.totalReviews || 0}
          </div>
          <p className="text-xs text-gray-600">Reviews</p>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {statistics.verifiedPurchasePercentage || 0}%
          </div>
          <p className="text-xs text-gray-600">Verified</p>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading reviews...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (respondingToReview) {
    return (
      <SellerResponseForm
        review={respondingToReview}
        onResponseSubmitted={handleResponseSubmitted}
        onCancel={handleCancelResponse}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Reviews Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span>⭐</span>
              <span>Customer Reviews</span>
            </div>
            {userEligibleToReview && (
              <Button size="sm" onClick={() => window.location.href = '/reviews'}>
                Write a Review
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statistics ? (
            <div className="space-y-6">
              {/* Quick Stats */}
              {renderQuickStats()}
              
              {/* Rating Breakdown */}
              <div className="border-t pt-6">
                {renderRatingBreakdown()}
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="font-medium mb-2">No reviews yet</h3>
              <p className="text-gray-600 text-sm">
                Be the first to review this product!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seller Actions */}
      {user?.id === sellerId && reviews.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>💬</span>
              <span>Seller Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Respond to customer reviews to build trust and show excellent customer service.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div>
                  <span className="font-medium">
                    {reviews.filter(r => r.seller_response?.content).length}
                  </span>
                  <span className="text-gray-600"> responses</span>
                </div>
                <div>
                  <span className="font-medium">
                    {reviews.filter(r => !r.seller_response?.content).length}
                  </span>
                  <span className="text-gray-600"> pending</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <ReviewList
          reviews={reviews.map(review => ({
            ...review,
            canRespond: user?.id === sellerId && !review.seller_response?.content,
            onRespond: () => handleRespondToReview(review)
          }))}
          statistics={statistics}
          onReviewUpdate={setReviews}
        />
      ) : !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
            <p className="text-gray-600 mb-4">
              This product hasn't been reviewed yet. Help other customers by sharing your experience!
            </p>
            {userEligibleToReview && (
              <Button onClick={() => window.location.href = '/reviews'}>
                Write the First Review
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProductReviews; 
