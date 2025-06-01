import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { api } from '../../services/api';
import { logger } from '../../utils/logger';

const ReviewForm = ({ order, onReviewSubmitted, onCancel }) => {
  const [formData, setFormData] = useState({
    productRating: 5,
    productReview: '',
    sellerRating: 5,
    sellerReview: '',
    aspects: {
      quality: 5,
      value: 5,
      shipping: 5,
      packaging: 5,
      communication: 5
    }
  });
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Get the first product from the order (assuming one product per review)
  const product = order.items[0]?.product_id;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleAspectChange = (aspect, value) => {
    setFormData(prev => ({
      ...prev,
      aspects: {
        ...prev.aspects,
        [aspect]: value
      }
    }));
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      alert('Maximum 5 images allowed');
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is too large (max 5MB)`);
        return false;
      }
      return true;
    });

    setImages(prev => [...prev, ...validFiles]);
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (formData.productReview.trim().length < 10) {
      newErrors.productReview = 'Product review must be at least 10 characters';
    }

    if (formData.sellerReview.trim().length < 10) {
      newErrors.sellerReview = 'Seller review must be at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();
      
      // Add text data
      formDataToSend.append('orderId', order._id);
      formDataToSend.append('productId', product._id);
      formDataToSend.append('productRating', formData.productRating);
      formDataToSend.append('productReview', formData.productReview.trim());
      formDataToSend.append('sellerRating', formData.sellerRating);
      formDataToSend.append('sellerReview', formData.sellerReview.trim());
      
      // Add aspects
      Object.entries(formData.aspects).forEach(([key, value]) => {
        formDataToSend.append(`aspects.${key}`, value);
      });

      // Add images
      images.forEach(image => {
        formDataToSend.append('images', image);
      });

      const response = await api.post('/reviews', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        alert('Review submitted successfully!');
        onReviewSubmitted(response.data.review);
      }

    } catch (error) {
      logger.error('Submit review error:', error);
      if (error.response?.data?.details) {
        const serverErrors = {};
        error.response.data.details.forEach(detail => {
          serverErrors[detail.param] = detail.msg;
        });
        setErrors(serverErrors);
      } else {
        alert(error.response?.data?.error || 'Failed to submit review');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating, onRatingChange) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange(star)}
            className={`text-2xl transition-colors ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            } hover:text-yellow-400`}
          >
            ★
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating}/5)</span>
      </div>
    );
  };

  if (!product) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Error: Product information not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-3">
          <span>📝</span>
          <div>
            <h2 className="text-xl font-bold">Write a Review</h2>
            <p className="text-sm text-gray-600">Order #{order.orderNumber}</p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Product Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center space-x-4">
              <img 
                src={product.images?.[0] || '/api/placeholder/80/80'} 
                alt={product.name}
                className="w-20 h-20 object-cover rounded"
              />
              <div>
                <h3 className="font-semibold">{product.name}</h3>
                <p className="text-sm text-gray-600">
                  Quantity: {order.items[0]?.quantity} | Price: ${order.items[0]?.price}
                </p>
              </div>
            </div>
          </div>

          {/* Product Review Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Rate the Product</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Overall Rating</label>
                {renderStars(formData.productRating, (rating) => 
                  handleInputChange('productRating', rating)
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Your Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.productReview}
                  onChange={(e) => handleInputChange('productReview', e.target.value)}
                  className={`w-full h-32 p-3 border rounded-lg resize-none ${
                    errors.productReview ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Share your experience with this product... (minimum 10 characters)"
                  maxLength={2000}
                />
                {errors.productReview && (
                  <p className="text-red-500 text-sm mt-1">{errors.productReview}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {formData.productReview.length}/2000 characters
                </p>
              </div>
            </div>

            {/* Product Aspects */}
            <div className="space-y-3">
              <h4 className="font-medium">Rate Different Aspects</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'quality', label: 'Quality' },
                  { key: 'value', label: 'Value for Money' },
                  { key: 'packaging', label: 'Packaging' }
                ].map(aspect => (
                  <div key={aspect.key}>
                    <label className="block text-sm font-medium mb-1">{aspect.label}</label>
                    {renderStars(formData.aspects[aspect.key], (rating) =>
                      handleAspectChange(aspect.key, rating)
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Seller Review Section */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Rate the Seller</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">Seller Rating</label>
                {renderStars(formData.sellerRating, (rating) => 
                  handleInputChange('sellerRating', rating)
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Seller Review <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.sellerReview}
                  onChange={(e) => handleInputChange('sellerReview', e.target.value)}
                  className={`w-full h-24 p-3 border rounded-lg resize-none ${
                    errors.sellerReview ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="How was your experience with the seller? (minimum 10 characters)"
                  maxLength={1000}
                />
                {errors.sellerReview && (
                  <p className="text-red-500 text-sm mt-1">{errors.sellerReview}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {formData.sellerReview.length}/1000 characters
                </p>
              </div>
            </div>

            {/* Seller Aspects */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'shipping', label: 'Shipping Speed' },
                { key: 'communication', label: 'Communication' }
              ].map(aspect => (
                <div key={aspect.key}>
                  <label className="block text-sm font-medium mb-1">{aspect.label}</label>
                  {renderStars(formData.aspects[aspect.key], (rating) =>
                    handleAspectChange(aspect.key, rating)
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Image Upload */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="text-lg font-semibold">Add Photos (Optional)</h3>
            
            <div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
              />
              <label
                htmlFor="image-upload"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
              >
                <span className="mr-2">📷</span>
                Add Photos
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Upload up to 5 images (max 5MB each)
              </p>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(image)}
                      alt={`Review ${index + 1}`}
                      className="w-full h-24 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-4 border-t pt-6">
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
              disabled={loading}
              className="px-6"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Submit Review'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ReviewForm; 