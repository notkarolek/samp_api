// SA-MP Multi-Server Query API for Launcher (per customer ID)
// This version supports multiple customers (by ID) each with their own server list
// Returns live player counts and info for each server

const express = require("express");
const dgram = require("dgram");
const app = express();
const PORT = process.env.PORT || 3000;

// === 1. Customer Server Config ===
// You control this: Add/edit customers and their server lists here
const customerServers = {
  "449": [
    {
      number: 9,
      name: "Project Los Angeles",
      ip: "51.68.44.123",
      port: 7777,
      password: false
    },
    {
      number: 10,
      name: "Texas Drift Wars",
      ip: "51.222.245.98",
      port: 7780,
      password: true
    }
  ],
  "450": [
    {
      number: 9,
      name: "Brazil Freeroam",
      ip: "45.67.89.22",
      port: 7777,
      password: false
    }
  ]
};

// === 2. SA-MP Server Query Function ===
function querySampServer(ip, port, callback) {
  const client = dgram.createSocket("udp4");
  const parts = ip.split(".").map(e => String.fromCharCode(Number(e)));
  const portLow = String.fromCharCode(port & 0xFF);
  const portHigh = String.fromCharCode((port >> 8) & 0xFF);
  const message = Buffer.from("SAMP" + parts.join("") + portLow + portHigh + "i", "binary");

  const timeout = setTimeout(() => {
    client.close();
    callback(null);
  }, 2000);

  client.send(message, 0, message.length, port, ip, (err) => {
    if (err) {
      clearTimeout(timeout);
      client.close();
      return callback(null);
    }
  });

  client.on("message", (msg) => {
    clearTimeout(timeout);
    client.close();
    try {
      const online = msg.readUInt16LE(11);
      const maxplayers = msg.readUInt16LE(13);
      callback({ online, maxplayers });
    } catch (e) {
      callback(null);
    }
  });
}

// === 3. Main API Endpoint ===
app.get("/mobile_client_ping/:id", async (req, res) => {
  const customerId = req.params.id;
  const servers = customerServers[customerId];

  if (!servers) {
    return res.status(404).json({ error: "Customer not found." });
  }

  // Query all servers in parallel
  const resultPromises = servers.map(server => {
    return new Promise(resolve => {
      querySampServer(server.ip, server.port, (data) => {
        if (!data) {
          return resolve(null); // skip offline/unreachable servers
        }
        resolve({
          number: server.number,
          name: server.name,
          ip: server.ip,
          port: server.port.toString(),
          online: data.online,
          maxplayers: data.maxplayers,
          password: server.password || false
        });
      });
    });
  });

  const results = await Promise.all(resultPromises);
  const filtered = results.filter(s => s !== null);
  res.json(filtered);
});

// === 4. Run Server ===
app.listen(PORT, () => {
  console.log(`SA-MP API server running on port ${PORT}`);
});
