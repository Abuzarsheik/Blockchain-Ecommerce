import { useState } from 'react';
import { logger } from './logger';

/**
 * User Personalization and Preferences System
 */

class PersonalizationManager {
  constructor() {
    this.preferences = this.loadPreferences();
    this.behaviorData = this.loadBehaviorData();
    this.recommendations = [];
  }

  // Load user preferences from localStorage
  loadPreferences() {
    try {
      const stored = localStorage.getItem('userPreferences');
      return stored ? JSON.parse(stored) : this.getDefaultPreferences();
    } catch (error) {
      logger.error('Failed to load preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  // Get default preferences
  getDefaultPreferences() {
    return {
      theme: 'light',
      language: 'en',
      currency: 'ETH',
      notifications: {
        email: true,
        push: true,
        browser: true,
        marketing: false
      },
      privacy: {
        analytics: true,
        tracking: false,
        personalization: true
      },
      display: {
        itemsPerPage: 20,
        gridView: true,
        showPrices: true,
        hideNSFW: true
      },
      categories: [],
      priceRange: { min: 0, max: 100 },
      favoriteCreators: [],
      blockedCreators: [],
      accessibility: {
        reducedMotion: false,
        highContrast: false,
        largeText: false,
        screenReader: false
      }
    };
  }

  // Load user behavior data
  loadBehaviorData() {
    try {
      const stored = localStorage.getItem('userBehavior');
      return stored ? JSON.parse(stored) : {
        viewHistory: [],
        searchHistory: [],
        purchaseHistory: [],
        favoriteCategories: {},
        timeSpent: {},
        interactionPatterns: {}
      };
    } catch (error) {
      logger.error('Failed to load behavior data:', error);
      return {};
    }
  }

  // Save preferences
  savePreferences() {
    try {
      localStorage.setItem('userPreferences', JSON.stringify(this.preferences));
      this.applyPreferences();
    } catch (error) {
      logger.error('Failed to save preferences:', error);
    }
  }

  // Save behavior data
  saveBehaviorData() {
    try {
      localStorage.setItem('userBehavior', JSON.stringify(this.behaviorData));
    } catch (error) {
      logger.error('Failed to save behavior data:', error);
    }
  }

  // Update preference
  updatePreference(key, value) {
    const keys = key.split('.');
    let current = this.preferences;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.savePreferences();
  }

  // Get preference value
  getPreference(key, defaultValue = null) {
    const keys = key.split('.');
    let current = this.preferences;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  // Apply preferences to UI
  applyPreferences() {
    // Apply theme
    const theme = this.getPreference('theme', 'light');
    document.documentElement.setAttribute('data-theme', theme);
    
    // Apply accessibility preferences
    const accessibility = this.getPreference('accessibility', {});
    
    if (accessibility.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
    
    if (accessibility.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
    
    if (accessibility.largeText) {
      document.documentElement.classList.add('large-text');
    } else {
      document.documentElement.classList.remove('large-text');
    }

    // Apply language
    const language = this.getPreference('language', 'en');
    document.documentElement.setAttribute('lang', language);
  }

  // Track user behavior
  trackBehavior(action, data) {
    const timestamp = Date.now();
    
    switch (action) {
      case 'view':
        this.trackView(data, timestamp);
        break;
      case 'search':
        this.trackSearch(data, timestamp);
        break;
      case 'purchase':
        this.trackPurchase(data, timestamp);
        break;
      case 'favorite':
        this.trackFavorite(data, timestamp);
        break;
      case 'timeSpent':
        this.trackTimeSpent(data, timestamp);
        break;
      default:
        // Unknown action type, log for debugging
        console.warn(`Unknown personalization action: ${action}`);
        break;
    }
    
    this.saveBehaviorData();
    this.updateRecommendations();
  }

  // Track item views
  trackView(item, timestamp) {
    if (!this.behaviorData.viewHistory) this.behaviorData.viewHistory = [];
    
    this.behaviorData.viewHistory.unshift({
      id: item.id,
      type: item.type,
      category: item.category,
      price: item.price,
      creator: item.creator,
      timestamp
    });
    
    // Keep only last 500 views
    this.behaviorData.viewHistory = this.behaviorData.viewHistory.slice(0, 500);
    
    // Update category preferences
    if (item.category) {
      if (!this.behaviorData.favoriteCategories) this.behaviorData.favoriteCategories = {};
      this.behaviorData.favoriteCategories[item.category] = 
        (this.behaviorData.favoriteCategories[item.category] || 0) + 1;
    }
  }

  // Track searches
  trackSearch(query, timestamp) {
    if (!this.behaviorData.searchHistory) this.behaviorData.searchHistory = [];
    
    this.behaviorData.searchHistory.unshift({
      query,
      timestamp
    });
    
    // Keep only last 100 searches
    this.behaviorData.searchHistory = this.behaviorData.searchHistory.slice(0, 100);
  }

  // Track purchases
  trackPurchase(item, timestamp) {
    if (!this.behaviorData.purchaseHistory) this.behaviorData.purchaseHistory = [];
    
    this.behaviorData.purchaseHistory.unshift({
      id: item.id,
      type: item.type,
      category: item.category,
      price: item.price,
      creator: item.creator,
      timestamp
    });
  }

  // Track time spent on pages
  trackTimeSpent(data, timestamp) {
    if (!this.behaviorData.timeSpent) this.behaviorData.timeSpent = {};
    
    const { page, duration } = data;
    if (!this.behaviorData.timeSpent[page]) {
      this.behaviorData.timeSpent[page] = 0;
    }
    this.behaviorData.timeSpent[page] += duration;
  }

  // Generate personalized recommendations
  updateRecommendations() {
    this.recommendations = [
      ...this.getCategoryRecommendations(),
      ...this.getCreatorRecommendations(),
      ...this.getPriceRangeRecommendations(),
      ...this.getTrendingRecommendations()
    ];
  }

  // Get category-based recommendations
  getCategoryRecommendations() {
    if (!this.behaviorData.favoriteCategories) return [];
    
    const sortedCategories = Object.entries(this.behaviorData.favoriteCategories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);
    
    return sortedCategories.map(([category, score]) => ({
      type: 'category',
      category,
      score,
      reason: `Based on your interest in ${category}`
    }));
  }

  // Get creator-based recommendations
  getCreatorRecommendations() {
    if (!this.behaviorData.viewHistory) return [];
    
    const creatorViews = {};
    this.behaviorData.viewHistory.forEach(view => {
      if (view.creator) {
        creatorViews[view.creator] = (creatorViews[view.creator] || 0) + 1;
      }
    });
    
    return Object.entries(creatorViews)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([creator, views]) => ({
        type: 'creator',
        creator,
        score: views,
        reason: `You've viewed ${views} items from ${creator}`
      }));
  }

  // Get price range recommendations
  getPriceRangeRecommendations() {
    if (!this.behaviorData.viewHistory || this.behaviorData.viewHistory.length < 5) return [];
    
    const prices = this.behaviorData.viewHistory
      .filter(view => view.price)
      .map(view => view.price);
    
    if (prices.length === 0) return [];
    
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    
    return [{
      type: 'priceRange',
      range: { min: minPrice, max: maxPrice },
      average: avgPrice,
      reason: `Based on your viewing patterns (avg: ${avgPrice.toFixed(2)} ETH)`
    }];
  }

  // Get trending recommendations
  getTrendingRecommendations() {
    // This would normally fetch from an API
    return [{
      type: 'trending',
      reason: 'Popular in your preferred categories',
      score: 0.8
    }];
  }

  // Get personalized filters
  getPersonalizedFilters() {
    const recommendations = this.recommendations;
    const filters = {};
    
    // Add category filters
    const categoryRecs = recommendations.filter(r => r.type === 'category');
    if (categoryRecs.length > 0) {
      filters.categories = categoryRecs.map(r => r.category);
    }
    
    // Add price range filters
    const priceRecs = recommendations.filter(r => r.type === 'priceRange');
    if (priceRecs.length > 0) {
      filters.priceRange = priceRecs[0].range;
    }
    
    // Add creator filters
    const creatorRecs = recommendations.filter(r => r.type === 'creator');
    if (creatorRecs.length > 0) {
      filters.creators = creatorRecs.map(r => r.creator);
    }
    
    return filters;
  }

  // Get user insights
  getUserInsights() {
    const totalViews = this.behaviorData.viewHistory?.length || 0;
    const totalSearches = this.behaviorData.searchHistory?.length || 0;
    const totalPurchases = this.behaviorData.purchaseHistory?.length || 0;
    
    const topCategory = this.getTopCategory();
    const averageSessionTime = this.getAverageSessionTime();
    const preferredPriceRange = this.getPreferredPriceRange();
    
    return {
      activity: {
        totalViews,
        totalSearches,
        totalPurchases
      },
      preferences: {
        topCategory,
        averageSessionTime,
        preferredPriceRange
      },
      recommendations: this.recommendations
    };
  }

  // Get top category
  getTopCategory() {
    if (!this.behaviorData.favoriteCategories) return null;
    
    const categories = Object.entries(this.behaviorData.favoriteCategories);
    if (categories.length === 0) return null;
    
    return categories.sort(([,a], [,b]) => b - a)[0][0];
  }

  // Get average session time
  getAverageSessionTime() {
    if (!this.behaviorData.timeSpent) return 0;
    
    const times = Object.values(this.behaviorData.timeSpent);
    if (times.length === 0) return 0;
    
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  // Get preferred price range
  getPreferredPriceRange() {
    if (!this.behaviorData.viewHistory) return null;
    
    const prices = this.behaviorData.viewHistory
      .filter(view => view.price)
      .map(view => view.price);
    
    if (prices.length === 0) return null;
    
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      average: prices.reduce((sum, price) => sum + price, 0) / prices.length
    };
  }

  // Reset all data
  reset() {
    localStorage.removeItem('userPreferences');
    localStorage.removeItem('userBehavior');
    this.preferences = this.getDefaultPreferences();
    this.behaviorData = {};
    this.recommendations = [];
  }

  // Export user data
  exportData() {
    return {
      preferences: this.preferences,
      behavior: this.behaviorData,
      recommendations: this.recommendations,
      insights: this.getUserInsights(),
      exportDate: new Date().toISOString()
    };
  }

  // Import user data
  importData(data) {
    try {
      if (data.preferences) {
        this.preferences = { ...this.getDefaultPreferences(), ...data.preferences };
        this.savePreferences();
      }
      
      if (data.behavior) {
        this.behaviorData = data.behavior;
        this.saveBehaviorData();
      }
      
      this.updateRecommendations();
      return true;
    } catch (error) {
      logger.error('Failed to import data:', error);
      return false;
    }
  }
}

// Create global instance
export const personalizationManager = new PersonalizationManager();

// React hook for using personalization
export const usePersonalization = () => {
  const [preferences, setPreferences] = useState(personalizationManager.preferences);
  const [insights, setInsights] = useState(personalizationManager.getUserInsights());

  const updatePreference = (key, value) => {
    personalizationManager.updatePreference(key, value);
    setPreferences({ ...personalizationManager.preferences });
  };

  const trackBehavior = (action, data) => {
    personalizationManager.trackBehavior(action, data);
    setInsights(personalizationManager.getUserInsights());
  };

  const getRecommendations = () => {
    return personalizationManager.recommendations;
  };

  const getPersonalizedFilters = () => {
    return personalizationManager.getPersonalizedFilters();
  };

  return {
    preferences,
    insights,
    updatePreference,
    trackBehavior,
    getRecommendations,
    getPersonalizedFilters,
    exportData: () => personalizationManager.exportData(),
    importData: (data) => personalizationManager.importData(data),
    reset: () => {
      personalizationManager.reset();
      setPreferences(personalizationManager.preferences);
      setInsights(personalizationManager.getUserInsights());
    }
  };
};

// Utility functions
export const applyUserPreferences = () => {
  personalizationManager.applyPreferences();
};

export const trackPageView = (page, item = null) => {
  if (item) {
    personalizationManager.trackBehavior('view', item);
  }
  
  // Track time spent on page
  let startTime = Date.now();
  
  const handleBeforeUnload = () => {
    const timeSpent = Date.now() - startTime;
    personalizationManager.trackBehavior('timeSpent', { page, duration: timeSpent });
  };
  
  window.addEventListener('beforeunload', handleBeforeUnload);
  
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    handleBeforeUnload();
  };
};

export default personalizationManager; 