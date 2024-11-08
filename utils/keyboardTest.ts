export const simulateKeyPress = (element: HTMLElement, key: string) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
};

export const testKeyboardNavigation = () => {
  const focusableElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  const results = {
    totalElements: focusableElements.length,
    reachableElements: 0,
    unreachableElements: [] as string[],
  };

  focusableElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    htmlElement.focus();
    
    if (document.activeElement === htmlElement) {
      results.reachableElements++;
    } else {
      results.unreachableElements.push(
        element.tagName + (element.id ? `#${element.id}` : '')
      );
    }
  });

  return results;
};

export const testAriaLabels = () => {
  const interactiveElements = document.querySelectorAll(
    'button, [href], input, select, textarea, [role="button"]'
  );

  const results = {
    totalElements: interactiveElements.length,
    labeledElements: 0,
    unlabeledElements: [] as string[],
  };

  interactiveElements.forEach((element) => {
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasLabel = element.hasAttribute('id') && document.querySelector(`label[for="${element.id}"]`);

    if (hasAriaLabel || hasAriaLabelledBy || hasLabel) {
      results.labeledElements++;
    } else {
      results.unlabeledElements.push(
        element.tagName + (element.id ? `#${element.id}` : '')
      );
    }
  });

  return results;
}; 