import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { api } from '../../services/api';
import { useSelector } from 'react-redux';
import { Send, X } from 'lucide-react';
import { logger } from '../../utils/logger';

const SellerResponseForm = ({ review, onResponseSubmitted, onCancel }) => {
  const { user } = useSelector((state) => state.auth);
  const [content, setContent] = useState(review.seller_response?.content || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = Boolean(review.seller_response?.content);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (content.trim().length < 10) {
      setError('Response must be at least 10 characters long');
      return;
    }

    if (content.trim().length > 1000) {
      setError('Response cannot exceed 1000 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.post(`/reviews/${review.id}/response`, {
        content: content.trim()
      });

      if (response.data.success) {
        alert(`Response ${isEditing ? 'updated' : 'submitted'} successfully!`);
        onResponseSubmitted(response.data.review);
      }
    } catch (error) {
      logger.error('Submit response error:', error);
      setError(error.response?.data?.error || 'Failed to submit response');
    } finally {
      setLoading(false);
    }
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    if (error) setError('');
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold">
              {isEditing ? 'Edit Your Response' : 'Respond to Review'}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Your response will be visible to all customers
            </p>
          </div>

          {/* Review Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start space-x-3">
              <img
                src={review.user_id?.profile?.avatar || '/api/placeholder/40/40'}
                alt={`${review.user_id?.firstName} ${review.user_id?.lastName}`}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium">
                    {review.user_id?.firstName} {review.user_id?.lastName}
                  </h4>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map(star => (
                      <span
                        key={star}
                        className={`text-sm ${
                          star <= review.product_rating ? 'text-yellow-400' : 'text-gray-300'
                        }`}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-gray-700 text-sm">
                  {review.product_review.length > 100 
                    ? `${review.product_review.substring(0, 100)}...`
                    : review.product_review
                  }
                </p>
                {review.seller_review && (
                  <p className="text-gray-600 text-sm mt-2 italic">
                    Seller review: {review.seller_review.length > 50 
                      ? `${review.seller_review.substring(0, 50)}...`
                      : review.seller_review
                    }
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Response Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Response <span className="text-red-500">*</span>
              </label>
              <textarea
                value={content}
                onChange={handleContentChange}
                className={`w-full h-32 p-3 border rounded-lg resize-none ${
                  error ? 'border-red-500' : 'border-gray-300'
                } focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                placeholder="Thank your customer and address any concerns professionally..."
                maxLength={1000}
                required
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
              )}
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm text-gray-500">
                  {content.length}/1000 characters
                </p>
                <p className="text-xs text-gray-400">
                  Minimum 10 characters required
                </p>
              </div>
            </div>

            {/* Guidelines */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">💡 Response Guidelines</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Thank the customer for their feedback</li>
                <li>• Address any specific concerns mentioned</li>
                <li>• Be professional and courteous</li>
                <li>• Offer solutions or invite further communication</li>
                <li>• Keep responses concise and helpful</li>
              </ul>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || content.trim().length < 10}
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>{isEditing ? 'Updating...' : 'Submitting...'}</span>
                  </div>
                ) : (
                  <span>{isEditing ? 'Update Response' : 'Submit Response'}</span>
                )}
              </Button>
            </div>
          </form>

          {/* Additional Info */}
          {isEditing && (
            <div className="text-xs text-gray-500 border-t pt-3">
              <p>
                Originally responded on: {' '}
                {new Date(review.seller_response.responded_at).toLocaleDateString()}
                {review.seller_response.edited_at && 
                  review.seller_response.edited_at !== review.seller_response.responded_at && (
                  <span>
                    {' • Last edited: '}
                    {new Date(review.seller_response.edited_at).toLocaleDateString()}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SellerResponseForm; 