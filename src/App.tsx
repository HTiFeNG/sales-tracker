import React from 'react';
import SalesTracker from './components/SalesTracker';

/**
 * Root application component.
 *
 * Simply renders the SalesTracker which handles all state and logic.
 * Theme and CSS baseline are configured in main.tsx.
 */
const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <SalesTracker />
    </div>
  );
};

export default App;
