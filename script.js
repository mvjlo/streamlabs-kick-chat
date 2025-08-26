const avatarCache = new Map();
const requestQueue = new Set();
const MAX_CACHE_SIZE = 500;
const REQUEST_DELAY = 100;
let lastRequestTime = 0;

const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/2/26/2019147183134_2019-05-27_Fussball_1.FC_Kaiserslautern_vs_FC_Bayern_M%C3%BCnchen_-_Sven_-_1D_X_MK_II_-_0228_-_B70I8527_%28cropped%29.jpg';

document.addEventListener('onEventReceived', function (obj) {
  if (obj.detail && obj.detail.command === 'message') {
    const username = obj.detail.from;
    
    if (requestQueue.has(username)) return;
    
    if (avatarCache.has(username)) {
      setAvatarForUser(username);
    } else {
      const now = Date.now();
      if (now - lastRequestTime > REQUEST_DELAY) {
        fetchAvatarForUser(username);
        lastRequestTime = now;
      } else {
        setTimeout(() => fetchAvatarForUser(username), REQUEST_DELAY);
      }
    }
  }
});

async function fetchAvatarForUser(username) {
  if (requestQueue.has(username)) return;
  requestQueue.add(username);
  
  try {
    if (avatarCache.size >= MAX_CACHE_SIZE) {
      const firstKey = avatarCache.keys().next().value;
      avatarCache.delete(firstKey);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(
      'https://kick.com/api/v2/channels/' + username.toLowerCase(), 
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      const avatarUrl = data.user?.profile_pic || DEFAULT_AVATAR;
      avatarCache.set(username, avatarUrl);
    } else {
      avatarCache.set(username, DEFAULT_AVATAR);
    }
    
  } catch (error) {
    avatarCache.set(username, DEFAULT_AVATAR);
  } finally {
    requestQueue.delete(username);
    setAvatarForUser(username);
  }
}

function setAvatarForUser(username) {
  const userMessages = document.querySelectorAll('[data-from="' + username + '"]');
  const avatarUrl = avatarCache.get(username);
  
  if (!avatarUrl) return;
  
  for (let i = 0; i < Math.min(userMessages.length, 10); i++) {
    const avatarImg = userMessages[i].querySelector('.avatar');
    if (avatarImg && avatarImg.src !== avatarUrl) {
      avatarImg.src = avatarUrl;
    }
  }
}