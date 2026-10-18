{!! '<?xml version="1.0" encoding="UTF-8"?>' !!}
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>{{ $title }}</title>
<link>{{ url('/blog') }}</link>
<atom:link href="{{ url('/blog/feed.xml') }}" rel="self" type="application/rss+xml" />
<description>{{ $description ?: $title }}</description>
<language>es-mx</language>
@foreach ($posts as $post)
<item>
<title>{{ $post->title }}</title>
<link>{{ url($post->url()) }}</link>
<guid isPermaLink="true">{{ url($post->url()) }}</guid>
<pubDate>{{ $post->published_at?->toRssString() }}</pubDate>
<description>{{ $post->excerpt }}</description>
</item>
@endforeach
</channel>
</rss>
