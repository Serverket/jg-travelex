import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { createTestOrderFlow, verifyUserOrdersAndInvoices } from '../utils/testOrderFlow';

const TestOrderFlow = () => {
  const { currentUser } = useAppContext();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verifyResults, setVerifyResults] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState(null);

  const handleCreateTestData = async () => {
    if (!currentUser?.id) {
      setError('Please log in first');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await createTestOrderFlow(currentUser.id);
      setResults(data);
    } catch (err) {
      console.error('Error creating test data:', err);
      setError(err.message || 'Failed to create test data');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyData = async () => {
    if (!currentUser?.id) {
      setVerifyError('Please log in first');
      return;
    }

    setVerifyLoading(true);
    setVerifyError(null);
    try {
      const data = await verifyUserOrdersAndInvoices(currentUser.id);
      setVerifyResults(data);
    } catch (err) {
      console.error('Error verifying data:', err);
      setVerifyError(err.message || 'Failed to verify data');
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <h2>Order Flow Testing</h2>
      
      {currentUser ? (
        <div className="alert alert-info">
          Logged in as: {currentUser.username} (ID: {currentUser.id})
        </div>
      ) : (
        <div className="alert alert-warning">
          You need to log in first
        </div>
      )}

      <div className="card mb-4">
        <div className="card-header">Create Test Data</div>
        <div className="card-body">
          <button 
            className="btn btn-primary" 
            onClick={handleCreateTestData} 
            disabled={loading || !currentUser}
          >
            {loading ? 'Creating...' : 'Create Test Trip, Order & Invoice'}
          </button>
          
          {error && (
            <div className="alert alert-danger mt-3">
              {error}
            </div>
          )}

          {results && (
            <div className="mt-4">
              <h5>Results:</h5>
              <pre className="bg-light p-3" style={{ maxHeight: '300px', overflow: 'auto' }}>
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">Verify User Orders & Invoices</div>
        <div className="card-body">
          <button 
            className="btn btn-success" 
            onClick={handleVerifyData} 
            disabled={verifyLoading || !currentUser}
          >
            {verifyLoading ? 'Verifying...' : 'Verify Orders & Invoices'}
          </button>
          
          {verifyError && (
            <div className="alert alert-danger mt-3">
              {verifyError}
            </div>
          )}

          {verifyResults && (
            <div className="mt-4">
              <h5>Verification Results:</h5>
              
              <div className="mb-3">
                <h6>User Orders: {verifyResults.userOrders.length}</h6>
                <pre className="bg-light p-3" style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(verifyResults.userOrders, null, 2)}
                </pre>
              </div>
              
              <div>
                <h6>User Invoices: {verifyResults.userInvoices.length}</h6>
                <pre className="bg-light p-3" style={{ maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify(verifyResults.userInvoices, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestOrderFlow;
