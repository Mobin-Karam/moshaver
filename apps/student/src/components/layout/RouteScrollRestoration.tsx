import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteScrollRestoration() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);

  return null;
}
