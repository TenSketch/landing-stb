import dotenv from 'dotenv';
dotenv.config();

import { handleEstimateFare } from '../lib/handlers.js';

const payload = {
  origin: {
    placeId: "ChIJu46G-bY22jER7B2sIv24BHY"
  },
  destination: {
    placeId: "ChIJX18m9g4Z2jER_TfUq7YtWwA"
  }
};

handleEstimateFare(payload)
  .then(res => console.log("SUCCESS:", JSON.stringify(res, null, 2)))
  .catch(err => console.error("ERROR:", err));
