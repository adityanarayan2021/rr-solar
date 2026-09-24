import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: 'RR Solar',
    description: 'MNRE and UPNEDA certified solar installation in Lucknow, Uttar Pradesh.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0E2A5C',
    theme_color: '#0E2A5C',
  };
}
