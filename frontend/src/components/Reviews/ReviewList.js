import React, { useState, useContext } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AuthContext } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const ReviewList = ({ reviews: initialReviews, statistics, onReviewUpdate }) => {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState(initialReviews || []);
  const [sortBy, setSortBy] = useState('newest');
  const [filterRating, setFilterRating] = useState('all');
  const [showImages, setShowImages] = useState(false);
  const [reportingReview, setReportingReview] = useState(null);
  const [reportData, setReportData] = useState({ reason: '', details: '' });

  const handleVoteHelpful = async (reviewId, voteType) => {
    if (!user) {
      alert('Please login to vote');
      return;
    }

    try {
      const response = await api.post(`/reviews/${reviewId}/helpful`, {
        vote: voteType
      });

      if (response.data.success) {
        setReviews(prev => prev.map(review => 
          review.id === reviewId 
            ? { 
                ...review, 
                helpful_votes: response.data.helpfulVotes,
                userVote: response.data.helpfulVotes.userVote
              }
            : review
        ));
      }
    } catch (error) {
      console.error('Vote helpful error:', error);
      alert(error.response?.data?.error || 'Failed to record vote');
    }
  };

  const handleReportReview = async (reviewId) => {
    if (!reportData.reason) {
      alert('Please select a reason for reporting');
      return;
    }

    try {
      const response = await api.post(`/reviews/${reviewId}/report`, reportData);
      
      if (response.data.success) {
        alert('Review reported successfully');
        setReportingReview(null);
        setReportData({ reason: '', details: '' });
      }
    } catch (error) {
      console.error('Report review error:', error);
      alert(error.response?.data?.error || 'Failed to report review');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`text-lg ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </span>
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  const renderRatingDistribution = () => {
    if (!statistics?.ratingDistribution) return null;

    const total = statistics.totalReviews;
    
    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map(rating => {
          const count = statistics.ratingDistribution[rating] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;
          
          return (
            <div key={rating} className="flex items-center space-x-2 text-sm">
              <span className="w-8">{rating}★</span>
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-400 h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              <span className="w-8 text-gray-600">{count}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const filteredAndSortedReviews = reviews
    .filter(review => {
      if (filterRating === 'all') return true;
      return review.product_rating === parseInt(filterRating);
    })
    .filter(review => {
      if (!showImages) return true;
      return review.images && review.images.length > 0;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at) - new Date(a.created_at);
        case 'oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'rating-high':
          return b.product_rating - a.product_rating;
        case 'rating-low':
          return a.product_rating - b.product_rating;
        case 'helpful':
          return (b.helpful_votes?.up || 0) - (a.helpful_votes?.up || 0);
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

  return (
    <div className="space-y-6">
      {/* Review Statistics */}
      {statistics && (
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Overall Rating */}
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900">
                  {statistics.averageRating || 0}
                </div>
                {renderStars(Math.round(statistics.averageRating || 0))}
                <p className="text-sm text-gray-600 mt-1">
                  {statistics.totalReviews} review{statistics.totalReviews !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Rating Distribution */}
              <div className="col-span-2">
                <h4 className="font-medium mb-3">Rating Breakdown</h4>
                {renderRatingDistribution()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Sorting */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Sort Options */}
              <div>
                <label className="text-sm font-medium mr-2">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="rating-high">Rating: High to Low</option>
                  <option value="rating-low">Rating: Low to High</option>
                  <option value="helpful">Most Helpful</option>
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="text-sm font-medium mr-2">Filter by rating:</label>
                <select
                  value={filterRating}
                  onChange={(e) => setFilterRating(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-1 text-sm"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              {/* Images Filter */}
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={showImages}
                  onChange={(e) => setShowImages(e.target.checked)}
                  className="rounded"
                />
                <span>With images only</span>
              </label>
            </div>

            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedReviews.length} of {reviews.length} reviews
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredAndSortedReviews.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium mb-2">No reviews found</h3>
              <p className="text-gray-600">
                {reviews.length === 0 
                  ? "Be the first to leave a review!" 
                  : "Try adjusting your filters to see more reviews."
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedReviews.map((review) => (
            <Card key={review.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Review Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={review.user_id?.profile?.avatar || '/api/placeholder/40/40'}
                        alt={`${review.user_id?.firstName} ${review.user_id?.lastName}`}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <h4 className="font-medium">
                          {review.user_id?.firstName} {review.user_id?.lastName}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {formatDate(review.created_at)}
                          {review.verified_purchase && (
                            <Badge variant="success" size="sm" className="ml-2">
                              ✓ Verified Purchase
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {review.canEdit && (
                        <Button size="sm" variant="outline">
                          Edit
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReportingReview(review.id)}
                      >
                        Report
                      </Button>
                    </div>
                  </div>

                  {/* Product Rating */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">Product Review</h5>
                      {renderStars(review.product_rating)}
                    </div>
                    <p className="text-gray-700">{review.product_review}</p>
                  </div>

                  {/* Aspects Ratings */}
                  {review.aspects && Object.keys(review.aspects).some(key => review.aspects[key]) && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 py-3 bg-gray-50 rounded-lg px-4">
                      {Object.entries(review.aspects).map(([aspect, rating]) => 
                        rating ? (
                          <div key={aspect} className="text-sm">
                            <span className="font-medium capitalize">{aspect}:</span>
                            <div className="flex items-center mt-1">
                              {renderStars(rating)}
                            </div>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}

                  {/* Seller Rating */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">Seller Review</h5>
                      {renderStars(review.seller_rating)}
                    </div>
                    <p className="text-gray-700">{review.seller_review}</p>
                  </div>

                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="space-y-2">
                      <h6 className="font-medium text-sm">Photos</h6>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {review.images.map((image, index) => (
                          <img
                            key={index}
                            src={image.url}
                            alt={`Review image ${index + 1}`}
                            className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => window.open(image.url, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Seller Response */}
                  {review.seller_response?.content && (
                    <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            S
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h6 className="font-medium text-blue-900">Seller Response</h6>
                            <span className="text-xs text-blue-700">
                              {formatDate(review.seller_response.responded_at)}
                            </span>
                          </div>
                          <p className="text-blue-800">{review.seller_response.content}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Helpfulness Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">Was this helpful?</span>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant={review.userVote === 'up' ? 'default' : 'outline'}
                          onClick={() => handleVoteHelpful(review.id, 'up')}
                          disabled={!user || review.user_id?.id === user?.id}
                        >
                          👍 {review.helpful_votes?.up || 0}
                        </Button>
                        <Button
                          size="sm"
                          variant={review.userVote === 'down' ? 'default' : 'outline'}
                          onClick={() => handleVoteHelpful(review.id, 'down')}
                          disabled={!user || review.user_id?.id === user?.id}
                        >
                          👎 {review.helpful_votes?.down || 0}
                        </Button>
                      </div>
                    </div>

                    {review.helpfulnessScore && (
                      <div className="text-sm text-gray-600">
                        {review.helpfulnessScore}% found this helpful
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Report Modal */}
      {reportingReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Report Review</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Reason *</label>
                  <select
                    value={reportData.reason}
                    onChange={(e) => setReportData(prev => ({ ...prev, reason: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2"
                  >
                    <option value="">Select a reason</option>
                    <option value="spam">Spam</option>
                    <option value="inappropriate">Inappropriate content</option>
                    <option value="fake">Fake review</option>
                    <option value="offensive">Offensive language</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Additional details</label>
                  <textarea
                    value={reportData.details}
                    onChange={(e) => setReportData(prev => ({ ...prev, details: e.target.value }))}
                    className="w-full h-24 border border-gray-300 rounded px-3 py-2 resize-none"
                    placeholder="Provide additional context..."
                    maxLength={500}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReportingReview(null);
                    setReportData({ reason: '', details: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReportReview(reportingReview)}
                  disabled={!reportData.reason}
                >
                  Submit Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default ReviewList; 