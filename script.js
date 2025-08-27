const avatarCache = new Map();
const requestQueue = new Set();
const MAX_CACHE_SIZE = 500;
const REQUEST_DELAY = 100;
let lastRequestTime = 0;

const DEFAULT_AVATAR = 'https://upload.wikimedia.org/wikipedia/commons/2/26/2019147183134_2019-05-27_Fussball_1.FC_Kaiserslautern_vs_FC_Bayern_M%C3%BCnchen_-_Sven_-_1D_X_MK_II_-_0228_-_B70I8527_%28cropped%29.jpg';

document.addEventListener('onEventReceived', function (obj) {
  if (obj.detail && (obj.detail.command === 'message' || obj.detail.command === 'PRIVMSG')) {
    const username = obj.detail.from;
    
    if (requestQueue.has(username)) return;
    
    if (MANUAL_AVATARS[cacheKey]) {
      avatarCache.set(cacheKey, MANUAL_AVATARS[cacheKey]);
      setAvatarForUser(actualUsername, cacheKey);
      return;
    }
    
    if (avatarCache.has(cacheKey)) {
      setAvatarForUser(actualUsername, cacheKey);
    } else {
      const now = Date.now();
      if (now - lastRequestTime > REQUEST_DELAY) {
        fetchAvatarForUser(username, command);
        lastRequestTime = now;
      } else {
        setTimeout(() => fetchAvatarForUser(username, command), REQUEST_DELAY);
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
    
    let response;
    
    if (command === 'message') {
      response = await fetch(
        'https://kick.com/api/v2/channels/' + cacheKey, 
        { signal: controller.signal }
      );
    } else if (command === 'PRIVMSG') {
      response = await fetch(
        TTV_API + cacheKey + '?api_key=' + API_KEY, 
        { signal: controller.signal }
      );
    }
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      let avatarUrl = DEFAULT_AVATAR;
      
      if (command === 'message') {
        avatarUrl = data.user?.profile_pic || DEFAULT_AVATAR;
      } else if (command === 'PRIVMSG') {
        avatarUrl = data.avatar || DEFAULT_AVATAR;
      }
      
      avatarCache.set(cacheKey, avatarUrl);
    } else {
      avatarCache.set(cacheKey, DEFAULT_AVATAR);
    }
    
  } catch (error) {
    avatarCache.set(cacheKey, DEFAULT_AVATAR);
  } finally {
    requestQueue.delete(cacheKey);
    const actualUsername = findActualUsername(username);
    setAvatarForUser(actualUsername, cacheKey);
  }
}

function setAvatarForUser(actualUsername, cacheKey) {
  const userMessages = document.querySelectorAll(`[data-from="${actualUsername}"]`);
  const avatarUrl = avatarCache.get(cacheKey);
  
  if (!avatarUrl) return;
  
  for (let i = 0; i < userMessages.length; i++) {
    const avatarImg = userMessages[i].querySelector('.avatar');
    if (avatarImg && avatarImg.src !== avatarUrl) {
      avatarImg.src = avatarUrl;
    }
  }
}
