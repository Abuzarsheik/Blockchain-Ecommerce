import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import IntelligentSearch from '../components/IntelligentSearch';
import AdvancedFilters from '../components/AdvancedFilters';
import '../styles/search-results.css';

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q');
  const intent = searchParams.get('intent');
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({});

  useEffect(() => {
    // Fetch search results based on query and intent
    console.log('Searching for:', query, 'with intent:', intent);
  }, [query, intent]);

  return (
    <div className="search-results-page">
      <div className="container">
        <h1>Search Results for "{query}"</h1>
        <div className="search-layout">
          <aside className="filters-sidebar">
            <AdvancedFilters 
              onFiltersChange={setFilters}
              initialFilters={filters}
            />
          </aside>
          <main className="results-content">
            <p>Found {results.length} results</p>
          </main>
        </div>
      </div>
    </div>
  );
};

export default SearchResults; 