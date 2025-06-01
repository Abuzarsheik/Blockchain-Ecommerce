import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { api } from '../services/api';
import ReviewForm from '../components/Reviews/ReviewForm';
import ReviewList from '../components/Reviews/ReviewList';

const ReviewsPage = () => {
  const { user } = useSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('eligible');
  const [eligibleOrders, setEligibleOrders] = useState([]);
  const [myReviews, setMyReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    if (user) {
      loadEligibleOrders();
      loadMyReviews();
    }
  }, [user]);

  const loadEligibleOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get('/reviews/eligible-orders');
      if (response.data.success) {
        setEligibleOrders(response.data.orders);
      }
    } catch (error) {
      console.error('Failed to load eligible orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyReviews = async () => {
    try {
      const response = await api.get('/reviews/user/my-reviews');
      if (response.data.success) {
        setMyReviews(response.data.reviews);
      }
    } catch (error) {
      console.error('Failed to load my reviews:', error);
    }
  };

  const handleWriteReview = (order) => {
    setSelectedOrder(order);
    setShowReviewForm(true);
  };

  const handleReviewSubmitted = (newReview) => {
    setShowReviewForm(false);
    setSelectedOrder(null);
    
    // Remove order from eligible orders
    setEligibleOrders(prev => prev.filter(order => order._id !== selectedOrder._id));
    
    // Add to my reviews
    setMyReviews(prev => [newReview, ...prev]);
    
    // Switch to my reviews tab
    setActiveTab('my-reviews');
  };

  const handleCancelReview = () => {
    setShowReviewForm(false);
    setSelectedOrder(null);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      </div>
    );
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Please Login</h2>
            <p className="text-gray-600">You need to be logged in to view and manage reviews.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showReviewForm && selectedOrder) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ReviewForm
          order={selectedOrder}
          onReviewSubmitted={handleReviewSubmitted}
          onCancel={handleCancelReview}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reviews & Ratings</h1>
          <p className="text-gray-600 mt-2">
            Manage your reviews and help other customers make informed decisions
          </p>
        </div>

        {/* Tab Navigation */}
        <Card>
          <CardContent className="p-0">
            <div className="flex border-b">
              <button
                onClick={() => setActiveTab('eligible')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'eligible'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>📝</span>
                  <span>Write Reviews</span>
                  {eligibleOrders.length > 0 && (
                    <Badge variant="destructive" size="sm">
                      {eligibleOrders.length}
                    </Badge>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('my-reviews')}
                className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
                  activeTab === 'my-reviews'
                    ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>⭐</span>
                  <span>My Reviews</span>
                  {myReviews.length > 0 && (
                    <Badge variant="info" size="sm">
                      {myReviews.length}
                    </Badge>
                  )}
                </div>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === 'eligible' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>📦</span>
                  <span>Orders Awaiting Review</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading orders...</p>
                  </div>
                ) : eligibleOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">✅</div>
                    <h3 className="text-lg font-medium mb-2">All caught up!</h3>
                    <p className="text-gray-600">
                      You have reviewed all your completed orders. 
                      New orders will appear here once they're delivered.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {eligibleOrders.map((order) => (
                      <div key={order._id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-4 mb-3">
                              <div>
                                <h4 className="font-medium">Order #{order.orderNumber}</h4>
                                <p className="text-sm text-gray-600">
                                  Delivered on {formatDate(order.created_at)}
                                </p>
                              </div>
                              <Badge variant="success">Delivered</Badge>
                            </div>
                            
                            <div className="space-y-2">
                              {order.items.map((item, index) => (
                                <div key={index} className="flex items-center space-x-3">
                                  <img
                                    src={item.product_id?.images?.[0] || '/api/placeholder/60/60'}
                                    alt={item.name}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                  <div className="flex-1">
                                    <h5 className="font-medium text-sm">{item.name}</h5>
                                    <p className="text-xs text-gray-600">
                                      Quantity: {item.quantity} • ${item.price}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="ml-4">
                            <Button
                              onClick={() => handleWriteReview(order)}
                              className="whitespace-nowrap"
                            >
                              Write Review
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'my-reviews' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <span>⭐</span>
                  <span>My Reviews</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myReviews.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-6xl mb-4">📝</div>
                    <h3 className="text-lg font-medium mb-2">No reviews yet</h3>
                    <p className="text-gray-600 mb-4">
                      Once you start writing reviews, they'll appear here.
                    </p>
                    {eligibleOrders.length > 0 && (
                      <Button
                        onClick={() => setActiveTab('eligible')}
                        variant="outline"
                      >
                        Write Your First Review
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {myReviews.map((review) => (
                      <div key={review.id} className="border rounded-lg p-4">
                        <div className="space-y-3">
                          {/* Review Header */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <img
                                src={review.product_id?.images?.[0] || '/api/placeholder/50/50'}
                                alt={review.product_id?.name}
                                className="w-12 h-12 object-cover rounded"
                              />
                              <div>
                                <h4 className="font-medium">{review.product_id?.name}</h4>
                                <p className="text-sm text-gray-600">
                                  Reviewed on {formatDate(review.created_at)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {review.canEdit && (
                                <Button size="sm" variant="outline">
                                  Edit
                                </Button>
                              )}
                              <Badge 
                                variant={review.status === 'approved' ? 'success' : 'warning'}
                                size="sm"
                              >
                                {review.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Product Review */}
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium">Product:</span>
                              {renderStars(review.product_rating)}
                            </div>
                            <p className="text-gray-700 text-sm">{review.product_review}</p>
                          </div>

                          {/* Seller Review */}
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className="text-sm font-medium">Seller:</span>
                              {renderStars(review.seller_rating)}
                            </div>
                            <p className="text-gray-700 text-sm">{review.seller_review}</p>
                          </div>

                          {/* Seller Response */}
                          {review.seller_response?.content && (
                            <div className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                              <p className="text-sm font-medium text-blue-900 mb-1">
                                Seller Response:
                              </p>
                              <p className="text-blue-800 text-sm">
                                {review.seller_response.content}
                              </p>
                            </div>
                          )}

                          {/* Review Stats */}
                          <div className="flex items-center justify-between pt-2 border-t text-sm text-gray-600">
                            <div className="flex items-center space-x-4">
                              <span>
                                👍 {review.helpful_votes?.up || 0} helpful
                              </span>
                              <span>
                                👎 {review.helpful_votes?.down || 0}
                              </span>
                            </div>
                            {review.verified_purchase && (
                              <Badge variant="success" size="sm">
                                ✓ Verified Purchase
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage; 