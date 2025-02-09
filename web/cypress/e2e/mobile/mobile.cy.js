/// <reference types="cypress" />

describe('Mobile Experience', () => {
  // Test each configured device
  Object.entries(Cypress.env('devices')).forEach(([device, config]) => {
    context(`Device: ${device}`, () => {
      beforeEach(() => {
        // Set up device configuration
        cy.viewport(config.width, config.height);
        cy.visit('/', {
          headers: {
            'User-Agent': config.userAgent
          },
          onBeforeLoad: (win) => {
            // Mock device orientation API
            Object.defineProperty(win.screen, 'orientation', {
              value: {
                type: 'portrait-primary',
                angle: 0,
                addEventListener: cy.stub().as('orientationListener'),
                removeEventListener: cy.stub()
              }
            });
          }
        });
      });

      describe('Video Upload', () => {
        it('handles portrait video upload on mobile', () => {
          // Test file upload
          cy.get('[data-cy=upload-input]')
            .attachFile({
              fileContent: 'cypress/fixtures/test-portrait.mp4',
              fileName: 'test-portrait.mp4',
              mimeType: 'video/mp4'
            });

          // Verify upload progress
          cy.get('[data-cy=upload-progress]')
            .should('be.visible')
            .and('have.attr', 'aria-valuenow')
            .and('not.equal', '0');

          // Verify successful upload
          cy.get('[data-cy=video-player]')
            .should('be.visible')
            .and('have.attr', 'src')
            .and('include', 'test-portrait');
        });

        it('shows clear error for landscape videos', () => {
          cy.get('[data-cy=upload-input]')
            .attachFile({
              fileContent: 'cypress/fixtures/test-landscape.mp4',
              fileName: 'test-landscape.mp4',
              mimeType: 'video/mp4'
            });

          cy.get('[data-cy=error-message]')
            .should('be.visible')
            .and('contain', 'Video must be in portrait orientation');
        });
      });

      describe('Video Playback', () => {
        beforeEach(() => {
          // Load a test video
          cy.get('[data-cy=upload-input]')
            .attachFile('test-portrait.mp4');
        });

        it('maintains smooth playback', () => {
          cy.get('[data-cy=video-player]')
            .should('have.prop', 'readyState', 4) // HAVE_ENOUGH_DATA
            .then(($video) => {
              // Check frame rate
              const frameRate = $video[0].getVideoPlaybackQuality().totalVideoFrames /
                              $video[0].duration;
              expect(frameRate).to.be.at.least(24);
            });
        });

        it('handles orientation changes', () => {
          // Trigger orientation change
          cy.window().then((win) => {
            win.screen.orientation.type = 'landscape-primary';
            win.dispatchEvent(new Event('orientationchange'));
          });

          // Verify video maintains portrait aspect
          cy.get('[data-cy=video-player]')
            .should('have.css', 'aspect-ratio', '9/16');
        });
      });

      describe('Performance', () => {
        it('meets performance thresholds', () => {
          // Use Lighthouse via Cypress task
          cy.task('checkPerformance', { url: Cypress.config().baseUrl })
            .then((metrics) => {
              expect(metrics.categories.performance.score).to.be.at.least(0.9);
              expect(metrics.audits['first-contentful-paint'].numericValue)
                .to.be.below(Cypress.env('performance').fcp);
              expect(metrics.audits['cumulative-layout-shift'].numericValue)
                .to.be.below(Cypress.env('performance').cls);
            });
        });

        it('handles low memory conditions', () => {
          // Simulate low memory
          cy.window().then((win) => {
            win.performance.memory = { jsHeapSizeLimit: 100 * 1024 * 1024 };
          });

          // Attempt video processing
          cy.get('[data-cy=upload-input]')
            .attachFile('test-portrait.mp4');

          // Verify graceful handling
          cy.get('[data-cy=error-message]')
            .should('not.exist');
        });
      });

      describe('Touch Interaction', () => {
        it('supports touch gestures', () => {
          cy.get('[data-cy=video-grid]')
            .trigger('touchstart', { touches: [{ clientX: 0, clientY: 0 }] })
            .trigger('touchmove', { touches: [{ clientX: 100, clientY: 0 }] })
            .trigger('touchend');

          // Verify scroll position changed
          cy.get('[data-cy=video-grid]')
            .should('have.prop', 'scrollLeft')
            .and('be.gt', 0);
        });

        it('has touch-friendly controls', () => {
          // Verify minimum touch target sizes
          cy.get('[data-cy=video-controls] button')
            .should('have.css', 'min-height', '44px')
            .and('have.css', 'min-width', '44px');
        });
      });

      describe('Network Resilience', () => {
        Object.entries(Cypress.env('networks')).forEach(([condition, config]) => {
          it(`handles ${condition} connection`, () => {
            // Set network condition
            cy.intercept('**', (req) => {
              if (config.offline) {
                req.destroy();
                return;
              }
              req.on('response', (res) => {
                // Simulate latency
                setTimeout(() => {}, config.latency);
              });
            });

            // Attempt video upload
            cy.get('[data-cy=upload-input]')
              .attachFile('test-portrait.mp4');

            if (config.offline) {
              cy.get('[data-cy=error-message]')
                .should('contain', 'No internet connection');
            } else {
              cy.get('[data-cy=upload-progress]')
                .should('be.visible');
            }
          });
        });
      });
    });
  });
});

describe('Offline Capabilities', () => {
  beforeEach(() => {
    // Register service worker
    cy.window().then((win) => {
      return navigator.serviceWorker.register('/serviceWorker.js');
    });
  });

  it('caches videos for offline viewing', () => {
    // Upload and view video
    cy.get('[data-cy=upload-input]')
      .attachFile('test-portrait.mp4');
    
    // Wait for cache
    cy.window().then((win) => {
      return new Promise(resolve => {
        const interval = setInterval(() => {
          caches.has('video-cache-v1').then(exists => {
            if (exists) {
              clearInterval(interval);
              resolve();
            }
          });
        }, 100);
      });
    });

    // Go offline
    cy.log('Going offline');
    cy.window().then((win) => {
      win.navigator.onLine = false;
      win.dispatchEvent(new Event('offline'));
    });

    // Video should still play
    cy.get('[data-cy=video-player]')
      .should('have.prop', 'readyState', 4);
  });

  it('saves upload progress', () => {
    // Start large upload
    cy.get('[data-cy=upload-input]')
      .attachFile('large-test.mp4');

    // Go offline mid-upload
    cy.window().then((win) => {
      win.navigator.onLine = false;
      win.dispatchEvent(new Event('offline'));
    });

    // Check progress saved
    cy.window().then(async (win) => {
      const db = await openProgressDB();
      const pending = await db.getAll('pending');
      expect(pending.length).to.be.gt(0);
    });

    // Restore connection
    cy.window().then((win) => {
      win.navigator.onLine = true;
      win.dispatchEvent(new Event('online'));
    });

    // Upload should complete
    cy.get('[data-cy=upload-progress]')
      .should('have.attr', 'aria-valuenow', '100');
  });
});

describe('Battery Management', () => {
  it('reduces quality on low battery', () => {
    cy.window().then((win) => {
      // Mock low battery
      Object.defineProperty(navigator, 'getBattery', {
        value: () => Promise.resolve({
          level: 0.15,
          charging: false,
          addEventListener: cy.stub()
        })
      });
    });

    // Upload video
    cy.get('[data-cy=upload-input]')
      .attachFile('test-portrait.mp4');

    // Should use lower quality settings
    cy.window().then((win) => {
      const worker = navigator.serviceWorker.controller;
      worker.postMessage({ type: 'BATTERY_STATUS', battery: { level: 0.15, charging: false }});
    });

    // Verify reduced quality processing
    cy.get('[data-cy=video-quality]')
      .should('contain', 'Battery Saver');
  });
});

describe('System Resources', () => {
  it('handles low storage conditions', () => {
    cy.window().then((win) => {
      // Mock storage quota
      Object.defineProperty(navigator, 'storage', {
        value: {
          estimate: () => Promise.resolve({
            quota: 100 * 1024 * 1024, // 100MB
            usage: 95 * 1024 * 1024 // 95MB used
          })
        }
      });
    });

    // Attempt upload
    cy.get('[data-cy=upload-input]')
      .attachFile('large-test.mp4');

    // Should show storage warning
    cy.get('[data-cy=storage-warning]')
      .should('be.visible')
      .and('contain', 'Low storage space');
  });

  it('handles memory pressure', () => {
    cy.window().then((win) => {
      // Trigger memory pressure
      if ('onmemorypressure' in win) {
        win.dispatchEvent(new Event('memorypressure'));
      }
    });

    // System should adapt
    cy.get('[data-cy=memory-status]')
      .should('contain', 'Memory optimization active');
  });
}); 