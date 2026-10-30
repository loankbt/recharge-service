import React, { useEffect, useState } from 'react';
import './App.css';
import WideBannerCarousel from './components/WideBannerCarousel';
import {
  BANNER_SECTION_1,
  BANNER_SECTION_2,
  BANNER_SECTION_3,
} from './constants/bannerSections';

export default function App() {
  const [rate, setRate] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchKrwToVndRate = async () => {
      try {
        const response = await fetch('/api/exchange-rate', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Exchange-rate request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!Number.isFinite(data.rate) || data.rate <= 0) {
          throw new Error('Exchange-rate response contains an invalid rate');
        }

        setRate(data.rate);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Unable to fetch the KRW to VND exchange rate:', error);
        }
      }
    };

    fetchKrwToVndRate();

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <main className="app" data-krw-vnd-rate={rate ?? undefined}>
      <div className="banner-sections">
        <WideBannerCarousel
          title="lezhin Hàn"
          items={BANNER_SECTION_1}
          aspectRatio="16 / 9"
          rate={rate}
        />

        <WideBannerCarousel
          title="các nền tảng Hàn khác"
          items={BANNER_SECTION_2}
          aspectRatio="4 / 3"
          rate={rate}
        />

        <WideBannerCarousel
          title="lezhin Anh"
          items={BANNER_SECTION_3}
          aspectRatio="16 / 9"
          rate={28000}
          currency={"usd"}
        />
      </div>
    </main>
  );
}
