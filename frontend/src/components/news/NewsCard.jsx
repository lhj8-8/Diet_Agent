// frontend/src/components/news/NewsCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const NewsCard = ({ id, imageSrc, imageAlt, source, meta, title, description, url }) => {
  return (
    <Link to={url} className="dashboard-card news-style" style={{ textDecoration: 'none', color: 'inherit' }}>
      <img src={imageSrc} className="news-thumb" alt={imageAlt} />
      <div className="news-meta">
        <span className={source === "LOW CARB" ? "news-source green" : source === "SNACK" ? "news-source purple" : source === "DRINK" ? "news-source orange" : "news-source"}>
          {source}
        </span>
        <span>· {meta}</span>
      </div>
      <h3 className="news-title">{title}</h3>
      <p className="card-desc">{description}</p>
    </Link>
  );
};

export default NewsCard;
