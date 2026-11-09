/**
 * Anti-WebP Showcase Controller — Nuclear 2D Locked 60 FPS
 * Strict Constraints:
 * 1. Zero 3D rotations (rotateX / rotateY killed completely)
 * 2. Giant .browser-mockup nodes remain 100% static during mousemove
 * 3. Only small .orbit-widget elements move in 2D (translate3d x, y only)
 * 4. Pure 2D state transitions (opacity, zIndex, slight 2D y slide)
 * 5. Single GSAP ticker synchronization
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. Cached DOM References (Queried ONCE)
  // =========================================================================
  const mockupProblem = document.getElementById('mockup-problem');
  const mockupSolution = document.getElementById('mockup-solution');
  const tabSolution = document.getElementById('tab-solution');
  const tabProblem = document.getElementById('tab-problem');
  const btnToggleDemo = document.getElementById('btn-toggle-demo');
  const toggleLabel = document.getElementById('toggle-label');
  const toggleIcon = document.getElementById('toggle-icon');
  const autoplayBar = document.getElementById('autoplay-bar');
  const mockupStage = document.getElementById('mockup-stage');
  const solutionMenu = document.getElementById('solution-menu');
  const successBadge = document.getElementById('success-badge');
  const simShelf = document.getElementById('sim-shelf');
  const errorDialog = mockupProblem ? mockupProblem.querySelector('.error-dialog') : null;
  const liveCountEl = document.getElementById('live-rescue-count');
  const widgets = Array.from(document.querySelectorAll('.orbit-widget'));
  const btnInstall = document.getElementById('btn-install-chrome');
  const installHint = document.querySelector('.install-instructions');

  let currentMode = 'solution'; // 'solution' or 'problem'

  // =========================================================================
  // 2. Pure 2D State Controller (Zero 3D transforms, fade + slight 2D y slide)
  // =========================================================================
  function setMode(mode, userInitiated = false) {
    currentMode = mode;

    if (mode === 'solution') {
      if (tabSolution) tabSolution.classList.add('active');
      if (tabProblem) tabProblem.classList.remove('active');
      if (toggleLabel) toggleLabel.textContent = 'Inspect Problem State';
      if (toggleIcon) toggleIcon.textContent = '❌';

      // Bring Solution mockup forward (pure 2D fade & slide)
      gsap.to(mockupSolution, {
        zIndex: 10,
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
        onStart: () => {
          mockupSolution.style.pointerEvents = 'auto';
        }
      });

      // Fade Problem mockup out
      gsap.to(mockupProblem, {
        zIndex: 2,
        opacity: 0,
        y: 12,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
        onComplete: () => {
          mockupProblem.style.pointerEvents = 'none';
        }
      });

      // Internal 2D micro-animations
      if (solutionMenu) {
        gsap.fromTo(solutionMenu, 
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.25, delay: 0.05, ease: "power2.out", overwrite: "auto" }
        );
      }

      if (successBadge) {
        gsap.fromTo(successBadge,
          { opacity: 0, y: -10 },
          { opacity: 1, y: 0, duration: 0.25, delay: 0.2, ease: "power2.out", overwrite: "auto" }
        );
      }

      if (simShelf) {
        gsap.fromTo(simShelf,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.2, delay: 0.35, ease: "power2.out", overwrite: "auto" }
        );
      }

      if (userInitiated && typeof confetti === 'function') {
        confetti({
          particleCount: 18,
          spread: 45,
          origin: { y: 0.6, x: 0.7 },
          colors: ['#4F46E5', '#818CF8', '#10B981'],
          disableForReducedMotion: true
        });
      }

    } else {
      if (tabProblem) tabProblem.classList.add('active');
      if (tabSolution) tabSolution.classList.remove('active');
      if (toggleLabel) toggleLabel.textContent = 'Play Solution Animation';
      if (toggleIcon) toggleIcon.textContent = '✨';

      // Bring Problem mockup forward (pure 2D fade & slide)
      gsap.to(mockupProblem, {
        zIndex: 10,
        opacity: 1,
        y: 0,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
        onStart: () => {
          mockupProblem.style.pointerEvents = 'auto';
        }
      });

      // Fade Solution mockup out
      gsap.to(mockupSolution, {
        zIndex: 2,
        opacity: 0,
        y: 12,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto",
        onComplete: () => {
          mockupSolution.style.pointerEvents = 'none';
        }
      });

      if (errorDialog) {
        gsap.fromTo(errorDialog,
          { opacity: 0, y: -8 },
          { opacity: 1, y: 0, duration: 0.25, ease: "power2.out", overwrite: "auto" }
        );
      }
    }
  }

  // =========================================================================
  // 3. Consolidated GSAP Autoplay Loop (Single Frame Budget)
  // =========================================================================
  let autoplayTween = null;
  if (autoplayBar) {
    autoplayTween = gsap.to(autoplayBar, {
      scaleX: 1,
      duration: 6,
      ease: "none",
      repeat: -1,
      onRepeat: () => {
        setMode(currentMode === 'solution' ? 'problem' : 'solution', false);
      }
    });
  }

  function handleManualToggle(targetMode) {
    setMode(targetMode, true);
    if (autoplayTween) {
      autoplayTween.restart();
    }
  }

  if (tabSolution) tabSolution.addEventListener('click', () => handleManualToggle('solution'), { passive: true });
  if (tabProblem) tabProblem.addEventListener('click', () => handleManualToggle('problem'), { passive: true });
  if (btnToggleDemo) {
    btnToggleDemo.addEventListener('click', () => {
      handleManualToggle(currentMode === 'solution' ? 'problem' : 'solution');
    }, { passive: true });
  }

  // =========================================================================
  // 4. Pure 2D Mouse Parallax — Small Widgets ONLY (.browser-mockup is 100% STATIC)
  // =========================================================================
  if (mockupStage && widgets.length > 0) {
    let stageRect = mockupStage.getBoundingClientRect();

    window.addEventListener('resize', () => {
      stageRect = mockupStage.getBoundingClientRect();
    }, { passive: true });

    // 2D translation only via translate3d(x, y, 0)
    const widgetQuickX = widgets.map(w => gsap.quickTo(w, "x", { duration: 0.35, ease: "power2.out" }));
    const widgetQuickY = widgets.map(w => gsap.quickTo(w, "y", { duration: 0.35, ease: "power2.out" }));
    const widgetDepths = widgets.map((_, i) => (i + 1) * 8);

    mockupStage.addEventListener('mousemove', (e) => {
      const x = e.clientX - stageRect.left - (stageRect.width * 0.5);
      const y = e.clientY - stageRect.top - (stageRect.height * 0.5);

      const normX = x / stageRect.width;
      const normY = y / stageRect.height;

      // Only small .orbit-widget elements move (no touch on .browser-mockup)
      for (let i = 0; i < widgets.length; i++) {
        const depth = widgetDepths[i];
        widgetQuickX[i](normX * depth);
        widgetQuickY[i](normY * depth);
      }
    }, { passive: true });

    mockupStage.addEventListener('mouseenter', () => {
      if (autoplayTween) autoplayTween.pause();
    }, { passive: true });

    mockupStage.addEventListener('mouseleave', () => {
      for (let i = 0; i < widgets.length; i++) {
        widgetQuickX[i](0);
        widgetQuickY[i](0);
      }

      if (autoplayTween) autoplayTween.resume();
    }, { passive: true });
  }

  // =========================================================================
  // 5. Lightweight Live Counter
  // =========================================================================
  if (liveCountEl) {
    let count = 1842910;
    setInterval(() => {
      count += Math.floor(Math.random() * 3) + 1;
      liveCountEl.textContent = count.toLocaleString();
    }, 3200);
  }

  // =========================================================================
  // 6. Install Button Helper
  // =========================================================================
  if (btnInstall && installHint) {
    btnInstall.addEventListener('click', () => {
      installHint.style.borderColor = '#FFB703';
      setTimeout(() => {
        installHint.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      }, 2500);
    }, { passive: true });
  }

  // Initial 2D presentation
  setMode('solution');
});
