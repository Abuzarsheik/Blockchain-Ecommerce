import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Upload, Image, FileText, DollarSign, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import '../styles/CreateNFT.css';

const CreateNFT = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector(state => state.auth);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Digital Art',
    image: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please log in to create NFTs');
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image file must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, PNG, GIF, WebP)');
        return;
      }

      setFormData(prev => ({
        ...prev,
        image: file
      }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please log in to create NFTs');
      return;
    }

    setIsLoading(true);

    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('category', formData.category);
      formDataToSend.append('image', formData.image);

      // Send to backend API
      const response = await api.post('/nfts', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      toast.success('NFT created successfully!');
      navigate('/catalog');
    } catch (error) {
      console.error('NFT creation error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create NFT. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="create-nft-page">
      <div className="container">
        <div className="create-header">
          <h1>Create New NFT</h1>
          <p>Mint your digital creation on the blockchain</p>
        </div>

        <form onSubmit={handleSubmit} className="create-form">
          <div className="form-section">
            <h2>Upload Image</h2>
            <div className="image-upload">
              {previewImage ? (
                <div className="image-preview">
                  <img src={previewImage} alt="Preview" />
                  <button 
                    type="button" 
                    onClick={() => {
                      setPreviewImage(null);
                      setFormData(prev => ({ ...prev, image: null }));
                    }}
                    className="remove-image"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="upload-area">
                  <Upload size={48} />
                  <span>Click to upload image</span>
                  <span className="upload-hint">PNG, JPG, GIF, WebP (Max 10MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    required
                  />
                </label>
              )}
            </div>
          </div>

          <div className="form-section">
            <h2>NFT Details</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>
                  <FileText size={20} />
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter NFT name"
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <Image size={20} />
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                >
                  <option value="Digital Art">Digital Art</option>
                  <option value="Collectibles">Collectibles</option>
                  <option value="Virtual Real Estate">Virtual Real Estate</option>
                  <option value="DeFi">DeFi</option>
                  <option value="Gaming">Gaming</option>
                  <option value="Music">Music</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label>
                  <FileText size={20} />
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your NFT..."
                  rows={4}
                  required
                />
              </div>

              <div className="form-group">
                <label>
                  <DollarSign size={20} />
                  Price (ETH)
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.1"
                  step="0.001"
                  min="0.001"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => navigate('/catalog')}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !formData.image}
            >
              {isLoading ? (
                <>
                  <Loader size={20} className="spinning" />
                  Creating NFT...
                </>
              ) : (
                'Create NFT'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNFT; 