import React from "react";
import "./HomePage.css";
import NewsCard from "../components/news/NewsCard.jsx";
import useFloatingWidgets from "../hooks/useFloatingWidgets";

import newsData from "../utils/newsData";

export default function HomePage() {
  const { chatOpen, memoOpen } = useFloatingWidgets(); // Removed editorRef, handleDrop, insertImage

  return (
    <div className="home-container">
      <div className={`recommend-container ${memoOpen ? "hidden-when-memo" : ""}`}>
        {/* Render news cards in groups of three */}
        {[0, 1, 2].map((groupIndex) => (
          <div className="dashboard-grid-home" key={groupIndex}>
            {newsData.slice(groupIndex * 3, (groupIndex + 1) * 3).map((news) => (
              <NewsCard
                key={news.id}
                id={news.id}
                imageSrc={news.imageSrc}
                imageAlt={news.imageAlt}
                source={news.source}
                meta={news.meta}
                title={news.title}
                description={news.description}
                url={news.url}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}