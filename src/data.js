export const tracks = [];

export const genres = [
  {
    id: 'g1',
    name: 'Reggaeton',
    color: 'from-purple-600 to-indigo-600',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300'
  },
  {
    id: 'g2',
    name: 'Pop',
    color: 'from-blue-600 to-cyan-600',
    image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300'
  },
  {
    id: 'g3',
    name: 'Trap',
    color: 'from-pink-600 to-rose-600',
    image: 'https://images.unsplash.com/photo-1601042879364-f3947d3f9c16?w=300'
  },
  {
    id: 'g4',
    name: 'Latino',
    color: 'from-amber-600 to-orange-600',
    image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=300'
  }
];


export const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.yt',
  'https://pipedapi.tokhmi.xyz',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.colt.top',
  'https://piped-api.lunar.icu',
  'https://pipedapi.r4fo.com'
];

export async function fetchFromPiped(endpoint) {
  const shuffledInstances = [...PIPED_INSTANCES].sort(() => Math.random() - 0.5);
  let lastError = null;

  for (const instance of shuffledInstances) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout for fast failover

      const response = await fetch(`${instance}${endpoint}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn(`Failed connection to instance: ${instance}`, err);
      lastError = err;
    }
  }
  throw lastError || new Error('No se pudo establecer conexión con los servidores de búsqueda.');
}

export const INVIDIOUS_INSTANCES = [
  'https://inv.thepixora.com',
  'https://invidious.flokinet.to',
  'https://yt.chocolatemoo53.com'
];

export async function fetchFromInvidious(endpoint) {
  const instances = [...INVIDIOUS_INSTANCES];

  // Map each instance to a fetch promise
  const promises = instances.map(async (instance) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${instance}${endpoint}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        // Check for stream endpoint to verify formats exist
        if (endpoint.includes('/api/v1/videos/') && (!data.adaptiveFormats || data.adaptiveFormats.length === 0)) {
          throw new Error('No adaptive formats in this Invidious instance');
        }
        return data;
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      throw err;
    }
  });

  try {
    // Return the first promise that resolves successfully
    return await Promise.any(promises);
  } catch (err) {
    console.error('All Invidious instances failed in parallel fetch:', err);
    throw new Error('No se pudo establecer conexión con los servidores de búsqueda global.');
  }
}



