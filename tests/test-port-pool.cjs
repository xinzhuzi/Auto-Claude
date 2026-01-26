/**
 * Port Pool Test Script
 *
 * Tests the fixed port pool implementation to ensure it properly
 * detects and handles port conflicts.
 */

const net = require('net');

/**
 * Port pool with actual port availability checking
 */
class PortPool {
  constructor(startPort = 18080) {
    this.startPort = startPort;
    this.allocatedPorts = new Set();
  }

  /**
   * Check if a port is actually available on the system
   */
  isPortAvailable(port) {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(false); // Port is in use
        } else {
          resolve(true); // Other error, assume available
        }
      });

      server.once('listening', () => {
        server.close(() => resolve(true)); // Port is available
      });

      server.listen(port, '127.0.0.1');
    });
  }

  /**
   * Allocate an available port
   */
  async allocate() {
    for (let port = this.startPort; port < this.startPort + 1000; port++) {
      // Skip if already allocated in our pool
      if (this.allocatedPorts.has(port)) {
        continue;
      }

      // Check if port is actually available on the system
      const isAvailable = await this.isPortAvailable(port);
      if (isAvailable) {
        this.allocatedPorts.add(port);
        return port;
      }

      // Port is in use by another process, try next
      console.log(`[PortPool] Port ${port} is in use, trying next port...`);
    }

    throw new Error('No available ports in range');
  }

  release(port) {
    this.allocatedPorts.delete(port);
  }
}

/**
 * Test scenarios
 */
async function testPortPool() {
  console.log('=== Port Pool Test ===\n');

  const portPool = new PortPool();

  // Test 1: Allocate first available port
  console.log('Test 1: Allocate first available port');
  const port1 = await portPool.allocate();
  console.log(`✓ Allocated port: ${port1}\n`);

  // Test 2: Simulate port conflict by manually occupying a port
  console.log('Test 2: Simulate port conflict');
  const conflictServer = net.createServer();
  await new Promise((resolve) => {
    conflictServer.listen(18081, '127.0.0.1', resolve);
  });
  console.log(`✓ Manually occupied port 18081\n`);

  // Test 3: Allocate port - should skip 18081
  console.log('Test 3: Allocate port (should skip 18081)');
  const port2 = await portPool.allocate();
  console.log(`✓ Allocated port: ${port2}`);
  console.log(`  Expected: Not 18081 (because it's occupied)`);
  console.log(`  Result: ${port2 !== 18081 ? 'PASS ✓' : 'FAIL ✗'}\n`);

  // Test 4: Release port and reallocate
  console.log('Test 4: Release and reallocate');
  portPool.release(port1);
  const port3 = await portPool.allocate();
  console.log(`✓ Released ${port1}, allocated ${port3}`);
  console.log(`  Expected: ${port1} (should be reusable)`);
  console.log(`  Result: ${port3 === port1 ? 'PASS ✓' : 'FAIL ✗'}\n`);

  // Cleanup
  conflictServer.close();
  portPool.release(port2);
  portPool.release(port3);

  console.log('=== All Tests Complete ===');
}

// Run tests
testPortPool().catch(console.error);
