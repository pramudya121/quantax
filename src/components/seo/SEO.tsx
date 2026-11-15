import { Helmet } from 'react-helmet-async';

const SITE_URL = 'https://dragondex.lovable.app';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  jsonLd?: object | object[];
}

export function SEO({ title, description, path, jsonLd }: SEOProps) {
  const url = `${SITE_URL}${path}`;
  const lds = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {lds.map((ld, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(ld)}</script>
      ))}
    </Helmet>
  );
}
