import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const VideoChatTestPolyfills = () => {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [testResults, setTestResults] = useState({});
  const [logs, setLogs] = useState([]);
  const [socket, setSocket] = useState(null);
  const [simplePeerLoaded, setSimplePeerLoaded] = useState(false);

  const addLog = (message) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testPolyfills = () => {
    const results = {};
    
    try {
      // Test global
      results.global = typeof global !== 'undefined' ? '✅ Available' : '❌ Missing';
    } catch (e) {
      results.global = `❌ Error: ${e.message}`;
    }

    try {
      // Test events
      const EventEmitter = require('events');
      const emitter = new EventEmitter();
      results.events = '✅ Working';
    } catch (e) {
      results.events = `❌ Error: ${e.message}`;
    }

    try {
      // Test util
      const util = require('util');
      results.util = util.inherits ? '✅ Working' : '❌ Missing inherits';
    } catch (e) {
      results.util = `❌ Error: ${e.message}`;
    }

    try {
      // Test buffer
      const { Buffer } = require('buffer');
      const buf = Buffer.from('test');
      results.buffer = buf.toString() === 'test' ? '✅ Working' : '❌ Not working';
    } catch (e) {
      results.buffer = `❌ Error: ${e.message}`;
    }

    try {
      // Test stream
      const stream = require('stream');
      results.stream = stream.Readable ? '✅ Working' : '❌ Missing Readable';
    } catch (e) {
      results.stream = `❌ Error: ${e.message}`;
    }

    setTestResults(results);
    addLog('Polyfill tests completed');
  };

  const testSocket = async () => {
    try {
      addLog('Testing Socket.IO connection...');
      const newSocket = io('https://meetworldbackend-production.up.railway.app', {
        auth: {
          token: localStorage.getItem('token')
        }
      });

      newSocket.on('connect', () => {
        setConnectionStatus('Connected');
        addLog('Socket.IO connected successfully');
      });

      newSocket.on('disconnect', () => {
        setConnectionStatus('Disconnected');
        addLog('Socket.IO disconnected');
      });

      newSocket.on('connect_error', (error) => {
        addLog(`Socket.IO connection error: ${error.message}`);
      });

      setSocket(newSocket);
    } catch (error) {
      addLog(`Socket.IO test failed: ${error.message}`);
    }
  };

  const testSimplePeer = async () => {
    try {
      addLog('Testing simple-peer import...');
      
      // Dynamic import to test
      const SimplePeer = (await import('simple-peer')).default;
      
      if (SimplePeer) {
        addLog('simple-peer imported successfully');
        
        // Try to create a peer instance
        const peer = new SimplePeer({
          initiator: true,
          trickle: false
        });
        
        peer.on('error', (err) => {
          addLog(`Simple-peer error: ${err.message}`);
        });

        peer.on('signal', (signal) => {
          addLog('Simple-peer signal generated successfully');
        });

        setSimplePeerLoaded(true);
        addLog('simple-peer test completed successfully');
      }
    } catch (error) {
      addLog(`simple-peer test failed: ${error.message}`);
      console.error('Simple-peer error:', error);
    }
  };

  useEffect(() => {
    testPolyfills();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Video Chat Polyfills Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Node.js Polyfills Status</h2>
        <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
          {Object.entries(testResults).map(([key, value]) => (
            <div key={key} style={{ margin: '5px 0' }}>
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Socket.IO Connection</h2>
        <div style={{ marginBottom: '10px' }}>
          Status: <span style={{ 
            color: connectionStatus === 'Connected' ? 'green' : 'red',
            fontWeight: 'bold'
          }}>
            {connectionStatus}
          </span>
        </div>
        <button 
          onClick={testSocket}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer',
            marginRight: '10px'
          }}
        >
          Test Socket Connection
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Simple-Peer Library</h2>
        <div style={{ marginBottom: '10px' }}>
          Status: <span style={{ 
            color: simplePeerLoaded ? 'green' : 'orange',
            fontWeight: 'bold'
          }}>
            {simplePeerLoaded ? 'Loaded Successfully' : 'Not Tested'}
          </span>
        </div>
        <button 
          onClick={testSimplePeer}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Test Simple-Peer
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Test Logs</h2>
        <div style={{ 
          backgroundColor: '#000', 
          color: '#00ff00', 
          padding: '10px', 
          borderRadius: '5px',
          height: '200px',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px'
        }}>
          {logs.map((log, index) => (
            <div key={index}>{log}</div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => {
            setLogs([]);
            setTestResults({});
            setSimplePeerLoaded(false);
            testPolyfills();
          }}
          style={{ 
            padding: '10px 20px', 
            backgroundColor: '#6c757d', 
            color: 'white', 
            border: 'none', 
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          Reset Tests
        </button>
      </div>
    </div>
  );
};

export default VideoChatTestPolyfills;
