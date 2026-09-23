import { Redirect } from 'expo-router';

// Overrides expo-router's generated route index, which otherwise ships in the
// production build as a public page listing every route.
export default function Sitemap() {
  return <Redirect href="/" />;
}
