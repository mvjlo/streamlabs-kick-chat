const DEFAULT_AVATAR = 'https://img.a.transfermarkt.technology/portrait/big/38253-1701118759.jpg'; 
const MANUAL_AVATARS = {
  "mvjloo": "https://media.tenor.com/dfX_eFm86f4AAAAM/szczesny-szcz%C4%99sny.gif",
  "user1" : "link",
  
};

// 7TV EMOTES
let kickSevenTVEmotes = {};
let globalSevenTVEmotes = {};
const KICK_NICK = ''; 

fetchKick7TVEmotes();

async function fetchKick7TVEmotes() {
  try {
    const chRes = await fetch(`https://api.streamelements.com/kappa/v2/channels/${KICK_NICK}`);
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

function setAvatarForUser(msg) {
  const username = msg.getAttribute('data-from');
  let avatarUrl = MANUAL_AVATARS[username] || DEFAULT_AVATAR;
  const avatarImg = msg.querySelector('.avatar');
  if (avatarImg) avatarImg.src = avatarUrl;
}

document.querySelectorAll('.chat-item[data-from]').forEach(msg => {
  msg.classList.add('platform-kick');
  setAvatarForUser(msg);
  const messageDiv = msg.querySelector('.message');
  if (messageDiv) parseKick7TVEmotesInDOM(messageDiv);
});

const logNode = document.getElementById('log');
if (logNode) {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (
          node.nodeType === 1 &&
          node.classList.contains('chat-item') &&
          node.hasAttribute('data-from')
        ) {
          node.classList.add('platform-kick');
          setAvatarForUser(node);
          const messageDiv = node.querySelector('.message');
          if (messageDiv) parseKick7TVEmotesInDOM(messageDiv);
        }
      });
    });
  });
  observer.observe(logNode, { childList: true });
}
