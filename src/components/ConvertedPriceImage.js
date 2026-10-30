import React, { useEffect, useState } from 'react';

export default function ConvertedPriceImage({
  image,
  alt,
  x,
  prices,
  rate,
  currency = 'krw',
  onImageClick,
}) {
  const [imageSrc, setImageSrc] = useState(image);

  useEffect(() => {
    if (!Number.isFinite(rate) || !Array.isArray(prices) || !Number.isFinite(x)) {
      setImageSrc(image);
      return undefined;
    }

    const source = new Image();
    source.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = source.naturalWidth;
        canvas.height = source.naturalHeight;

        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Unable to create a canvas context for the Lezhin image.');
        }

        context.drawImage(source, 0, 0);
        context.font = `bold ${Math.round(canvas.width * 0.035)}px Helvetica Neue, sans-serif`;
        context.fillStyle = '#FF3333';
        context.textAlign = 'center';
        context.textBaseline = 'middle';

        if (currency === 'usd') {
          prices.forEach(({ usd, y }) => {
            const vnd = Math.round((usd * rate) / 1000);
            context.fillText(`${vnd}k`, canvas.width * x, canvas.height * y);
          });
        } else {
          prices.forEach(({ krw, labor_cost, y }) => {
            const vnd = Math.trunc((Math.round(krw * rate) + labor_cost) / 1000);
            context.fillText(`${vnd}k`, canvas.width * x, canvas.height * y);
          });
        }

        setImageSrc(canvas.toDataURL('image/jpeg', 0.95));
      } catch (error) {
        console.error('Unable to add VND prices to the Lezhin image:', error);
      }
    };
    source.onerror = () => {
      console.error(`Unable to load the Lezhin image: ${image}`);
    };
    source.src = image;

    return () => {
      source.onload = null;
      source.onerror = null;
    };
  }, [image, x, prices, rate, currency]);

  return (
    <img
      src={imageSrc}
      alt={alt}
      className="banner-image"
      role="button"
      tabIndex={0}
      aria-label={`View full image: ${alt}`}
      onClick={() => onImageClick(imageSrc)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onImageClick(imageSrc);
        }
      }}
    />
  );
}
