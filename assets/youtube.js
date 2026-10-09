// No player, thumbnail, or YouTube connection exists until an explicit choice.
(function () {
  document.querySelectorAll('.youtube-embed').forEach(function (embed) {
    const id = embed.dataset.youtubeId;
    if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;

    const container = embed.querySelector('.video-container');
    const placeholder = embed.querySelector('.video-placeholder');
    const load = embed.querySelector('[data-video-load]');
    const unload = embed.querySelector('[data-video-unload]');
    const status = embed.querySelector('[data-video-status]');
    let player;

    load.hidden = false;
    load.addEventListener('click', function () {
      if (player) return;
      player = document.createElement('iframe');
      player.title = embed.dataset.videoTitle;
      player.src = 'https://www.youtube-nocookie.com/embed/' + id;
      player.loading = 'eager';
      player.allow = 'encrypted-media; picture-in-picture; web-share';
      player.referrerPolicy = 'strict-origin-when-cross-origin';
      player.allowFullscreen = true;
      placeholder.hidden = true;
      unload.hidden = false;
      container.appendChild(player);
      status.textContent = 'YouTube player enabled. Use Unload YouTube video to disconnect it.';
      player.focus();
    });

    unload.addEventListener('click', function () {
      if (!player) return;
      player.remove();
      player = null;
      placeholder.hidden = false;
      unload.hidden = true;
      status.textContent = 'YouTube player removed. It will not reconnect unless you load it again.';
      load.focus();
    });
  });
})();
