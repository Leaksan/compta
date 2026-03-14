import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3001;
const CHARIOW_API_KEY = process.env.CHARIOW_API_KEY;

app.post('/api/validate-license', async (req, res) => {
  const { licenseKey } = req.body;

  if (!licenseKey) {
    return res.status(400).json({ valid: false, error: 'La clé de licence est requise' });
  }

  try {
    const response = await fetch(`https://api.chariow.com/v1/licenses/${licenseKey}`, {
      headers: {
        'Authorization': `Bearer ${CHARIOW_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return res.json({ valid: false, error: 'Clé de licence invalide' });
      }
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        valid: false,
        error: errorData.message || 'Erreur lors de la validation'
      });
    }

    const data = await response.json();

    // The requirements say to check is_active and is_expired
    const isActive = data.is_active;
    const isExpired = data.is_expired;

    if (isActive && !isExpired) {
      return res.json({ valid: true, license: data });
    } else {
      let error = 'Licence invalide';
      if (!isActive) error = 'Licence inactive';
      if (isExpired) error = 'Licence expirée';
      return res.json({ valid: false, error });
    }
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(500).json({ valid: false, error: 'Erreur serveur lors de la validation' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
