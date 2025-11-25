/**
 * EchoPlus DevTools Integration
 * Creates the DevTools panel
 */

chrome.devtools.panels.create(
  'EchoPlus',
  'icons/icon48.png',
  'panel.html',
  (panel) => {
    
    // Panel lifecycle events
    panel.onShown.addListener((panelWindow) => {
      if (panelWindow.onPanelShown) {
        panelWindow.onPanelShown();
      }
    });

    panel.onHidden.addListener(() => {
    });
  }
);
