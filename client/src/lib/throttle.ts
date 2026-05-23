export function throttle<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let last = 0;
  let pending: ReturnType<typeof setTimeout> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  const wrapped = (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      last = now;
      if (pending) {
        clearTimeout(pending);
        pending = null;
      }
      fn(...args);
    } else {
      pendingArgs = args;
      if (!pending) {
        pending = setTimeout(() => {
          last = Date.now();
          pending = null;
          if (pendingArgs) fn(...pendingArgs);
        }, remaining);
      }
    }
  };
  return wrapped as T;
}
