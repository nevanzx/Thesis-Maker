import React from 'react';
import ReactDOM from 'react-dom/client';
import FigureEditor from './FigureEditor';

// Simple test component to isolate FigureEditor
function TestApp() {
  const handleFigureChange = (figureData) => {
    console.log('Figure data changed:', figureData);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Figure Editor Test</h1>
      <FigureEditor
        initialFigureData={{ type: 'IV, DV, MODV', iv: 'Independent Variable', dv: 'Dependent Variable', modv: 'Moderating Variable', iv1: '', iv2: '' }}
        onFigureChange={handleFigureChange}
      />
      <br />
      <FigureEditor
        initialFigureData={{ type: '2IV, DV', iv: '', dv: 'Dependent Variable', modv: '', iv1: 'Independent Var 1', iv2: 'Independent Var 2' }}
        onFigureChange={handleFigureChange}
      />
    </div>
  );
}

// Render the test app
const container = document.getElementById('root');
const root = ReactDOM.createRoot(container);
root.render(<TestApp />);