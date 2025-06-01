import React from 'react';
import WishlistSystem from '../components/WishlistSystem';

const Wishlist = () => {
  return (
    <div className="wishlist-page">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">My Wishlist</h1>
        <WishlistSystem isPage={true} />
      </div>
    </div>
  );
};

export default Wishlist; 