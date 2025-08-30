const avatarCache = new Map();
const requestQueue = new Set();
const MAX_CACHE_SIZE = 500;
const REQUEST_DELAY = 100;
let lastRequestTime = 0;

//API
const TTV_API = 'ttvapi';
const API_KEY = 'apikey';

//AVATARS
const DEFAULT_AVATAR = 'defaultlink';
const MANUAL_AVATARS = {
  
};

const TTV_NICK = '';

function findActualUsername(searchUsername) {
  let messages = document.querySelectorAll(`[data-from="${searchUsername}"]`);
  if (messages.length > 0) return searchUsername;
  const allMessages = document.querySelectorAll('[data-from]');
  for (const msg of allMessages) {
    const dataFrom = msg.getAttribute('data-from');
    if (dataFrom.toLowerCase() === searchUsername.toLowerCase()) {
      return dataFrom;
    }
  }
  return searchUsername;
}

let kickSevenTVEmotes = {};
let globalSevenTVEmotes = {};
fetchKick7TVEmotes();

async function fetchKick7TVEmotes() {
  try {
    const chRes = await fetch(`https://api.streamelements.com/kappa/v2/channels/${TTV_NICK}`);
    if (!chRes.ok) return;
    const chJson = await chRes.json();
    const channelId = chJson._id;
    if (!channelId) return;
    const emoRes = await fetch(`https://api.streamelements.com/kappa/v2/channels/${channelId}/emotes`);
    if (!emoRes.ok) return;
    const emoJson = await emoRes.json();
    if (emoJson.sevenTVChannelEmotes && typeof emoJson.sevenTVChannelEmotes === 'object') {
      kickSevenTVEmotes = emoJson.sevenTVChannelEmotes;
    }
    if (emoJson.sevenTVGlobalEmotes && typeof emoJson.sevenTVGlobalEmotes === 'object') {
      globalSevenTVEmotes = emoJson.sevenTVGlobalEmotes;
    }
  } catch (e) {}
}

function parseKick7TVEmotes(text) {
  const allEmotes = Object.assign({}, kickSevenTVEmotes, globalSevenTVEmotes);
  if (!Object.keys(allEmotes).length) return text;
  return text.split(' ').map(word => {
    if (/^[a-zA-Z0-9]+$/.test(word) && allEmotes[word]) {
      const emote = allEmotes[word];
      if (emote.urls && emote.urls["2"]) {
        const url = emote.urls["2"];
        return `<span class="emote"><img src="${url}" alt="${emote.name}" title="${emote.name}"></span>`;
      }
    }
    return word;
  }).join(' ');
}

function parseKick7TVEmotesInDOM(node) {
  for (let child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const replaced = parseKick7TVEmotes(child.textContent);
      if (replaced !== child.textContent) {
        const temp = document.createElement('span');
        temp.innerHTML = replaced;
        while (temp.firstChild) {
          node.insertBefore(temp.firstChild, child);
        }
        node.removeChild(child);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (!child.classList.contains('emote')) {
        parseKick7TVEmotesInDOM(child);
      }
    }
  }
}

document.addEventListener('onEventReceived', function (obj) {
  if (obj.detail && (obj.detail.command === 'message' || obj.detail.command === 'PRIVMSG')) {
    const username = obj.detail.from;
    const command = obj.detail.command;
    const actualUsername = findActualUsername(username);
    const userMessages = document.querySelectorAll(`[data-from="${actualUsername}"]`);
    const platformClass = command === 'message' ? 'platform-kick' : 'platform-twitch';
    userMessages.forEach(msg => {
      if (!msg.classList.contains('platform-kick') && !msg.classList.contains('platform-twitch')) {
        msg.classList.add(platformClass);
      }
    });
    const cacheKey = username.toLowerCase();
    if (requestQueue.has(cacheKey)) return;
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

async function fetchAvatarForUser(username, command) {
  const cacheKey = username.toLowerCase();
  if (requestQueue.has(cacheKey)) return;
  requestQueue.add(cacheKey);
  try {
    if (MANUAL_AVATARS[cacheKey]) {
      avatarCache.set(cacheKey, MANUAL_AVATARS[cacheKey]);
      const actualUsername = findActualUsername(username);
      setAvatarForUser(actualUsername, cacheKey);
      return;
    }
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

const logNode = document.getElementById('log');
if (logNode) {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.classList.contains('chat-item') && node.classList.contains('platform-kick')) {
          const messageDiv = node.querySelector('.message');
          if (messageDiv) {
            parseKick7TVEmotesInDOM(messageDiv);
          }
        }
      });
    });
  });
  observer.observe(logNode, { childList: true });
}
