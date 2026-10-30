import React, { useEffect, useRef, useState } from 'react';
import ConvertedPriceImage from './ConvertedPriceImage';

export default function WideBannerCarousel({
  title,
  items,
  aspectRatio = '16 / 9',
  rate,
  currency = 'krw',
}) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (!selectedImage) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedImage(null);
      }
    };

    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedImage]);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
    }
  };

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="banner-section">
      <div className="banner-header">
        <div>
          <h4 className="banner-title">{title}</h4>
        </div>
      </div>

      <div className="carousel">
        {canScrollLeft && (
          <button
            onClick={() => handleScroll('left')}
            className="carousel-button carousel-button-left"
            aria-label="Previous Slide"
          >
            <span aria-hidden="true" className="carousel-chevron" />
          </button>
        )}

        {canScrollRight && (
          <button
            onClick={() => handleScroll('right')}
            className="carousel-button carousel-button-right"
            aria-label="Next Slide"
          >
            <span aria-hidden="true" className="carousel-chevron" />
          </button>
        )}

        <div ref={scrollRef} onScroll={checkScroll} className="banner-track">
          {items.map((item) => {
            const imageTitle = item.tag ? `${title}: ${item.tag}` : title;
            return (
              <div
                key={item.id}
                className="banner-card"
                style={{ aspectRatio }}
              >
                <div className="banner-image-container">
                  <ConvertedPriceImage
                    image={item.image}
                    alt={imageTitle}
                    x={item.x}
                    prices={item.prices}
                    rate={rate}
                    currency={currency}
                    onImageClick={(src) => setSelectedImage({ src, title: imageTitle })}
                  />

                  {item.tag && (
                    <div className="banner-badge" style={{ backgroundColor: item.badgeBg }}>
                      <span className="banner-badge-text">
                        {item.tag}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {selectedImage && (
        <div
          className="image-viewer"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedImage(null);
            }
          }}
        >
          <div className="image-viewer-dialog" role="dialog" aria-modal="true" aria-label={selectedImage.title}>
            <button
              type="button"
              className="image-viewer-close"
              aria-label="Close full image"
              onClick={() => setSelectedImage(null)}
              autoFocus
            >
              <span className="image-viewer-close-icon" aria-hidden="true" />
            </button>
            <img src={selectedImage.src} alt={selectedImage.title} className="image-viewer-image" />
          </div>
        </div>
      )}
    </section>
  );
}
