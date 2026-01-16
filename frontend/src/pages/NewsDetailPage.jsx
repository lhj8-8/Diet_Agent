import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import newsData from '../utils/newsData';
import './NewsDetailPage.css'; // Assuming you might want to add styles

export default function NewsDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Find the news item by its ID (note: useParams returns a string)
  const newsItem = newsData.find(item => item.id.toString() === id);

  if (!newsItem) {
    return (
      <div className="news-detail-page">
        <h2>뉴스를 찾을 수 없습니다.</h2>
        <Link to="/home">홈으로 돌아가기</Link>
      </div>
    );
  }

  return (
    <div className="news-detail-page">

      <article className="news-content">
        <h1>{newsItem.title}</h1>
        <div className="news-meta-detail">
          <span className="source">{newsItem.source}</span>
          <span className="meta">{newsItem.meta}</span>
        </div>
        <img src={newsItem.imageSrc} alt={newsItem.imageAlt} className="news-image-detail" />
        <p className="news-description-detail">{newsItem.description}</p>
        {newsItem.fullContent && (
          <div className="news-full-content">
            {newsItem.fullContent.split('\n').map((line, index) => {
              const trimmedLine = line.trim();
              if (trimmedLine.length === 0) {
                // Render a spacer for intentional line breaks, but not for every single one
                if (index > 0 && newsItem.fullContent.split('\n')[index-1].trim().length > 0) {
                  return <div key={index} style={{ height: '1rem' }} />;
                }
                return null;
              }
              // A heuristic: if a line is short and doesn't end with a period, it's probably a heading.
              if (trimmedLine.length < 50 && !trimmedLine.endsWith('.') && !trimmedLine.endsWith(':')) {
                return <h3 key={index} className="content-subheading">{trimmedLine}</h3>;
              }
              return <p key={index} className="content-paragraph">{trimmedLine}</p>;
            })}
          </div>
        )}
      </article>
    </div>
  );
}
