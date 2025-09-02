const DEFAULT_AVATAR = 'https://img.a.transfermarkt.technology/portrait/big/38253-1701118759.jpg'; 
const MANUAL_AVATARS = {

};

function setAvatarForUser(msg) {
  const username = msg.getAttribute('data-from');
  let avatarUrl = MANUAL_AVATARS[username] || DEFAULT_AVATAR;
  const avatarImg = msg.querySelector('.avatar');
  if (avatarImg) avatarImg.src = avatarUrl;
}

document.querySelectorAll('.chat-item[data-from]').forEach(msg => {
  msg.classList.add('platform-twitch');
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
          node.classList.add('platform-twitch');
          setAvatarForUser(node);
          const messageDiv = node.querySelector('.message');
          if (messageDiv) parseKick7TVEmotesInDOM(messageDiv);
        }
      });
    });
  });
  observer.observe(logNode, { childList: true });
}
