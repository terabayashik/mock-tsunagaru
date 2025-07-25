import { useCallback } from "react";
import type { CsvContent, TextContent, WeatherContent } from "~/types/content";
import { logger } from "~/utils/logger";
import { useContent } from "./useContent";

/**
 * テストデータを生成するためのhook
 */
export const useTestData = () => {
  const { createTextContent, createUrlContent, createFileContent, createWeatherContent, createCsvContent } =
    useContent();

  /**
   * テスト用の画像データを作成
   * SVGを使用して動的に画像を生成
   */
  const createTestImageData = useCallback((name: string, color: string, width = 800, height = 600): File => {
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${color}"/>
        <text x="50%" y="50%" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="48" fill="white">
          ${name}
        </text>
        <text x="50%" y="60%" text-anchor="middle" dy="0.35em" font-family="Arial, sans-serif" font-size="24" fill="white">
          ${width}x${height}
        </text>
      </svg>
    `;

    const blob = new Blob([svg], { type: "image/svg+xml" });
    return new File([blob], `${name}.svg`, { type: "image/svg+xml" });
  }, []);

  /**
   * テストデータを一括作成
   */
  const createTestData = useCallback(async (): Promise<{
    total: number;
    success: number;
    failed: string[];
  }> => {
    const results = {
      total: 20, // 画像4件 + テキスト4件 + YouTube4件 + URL4件 + 気象情報2件 + CSV2件
      success: 0,
      failed: [] as string[],
    };

    try {
      // 1. 画像データを作成（SVGファイルとして）
      const imageData = [
        { name: "テスト画像1", color: "#FF6B6B" },
        { name: "テスト画像2", color: "#4ECDC4" },
        { name: "テスト画像3", color: "#45B7D1" },
        { name: "テスト画像4", color: "#FFA07A" },
      ];

      for (const image of imageData) {
        try {
          const file = createTestImageData(image.name, image.color);
          // SVGファイルとして保存するために、createFileContentを直接呼び出す
          await createFileContent(file, image.name);
          results.success++;
        } catch (error) {
          logger.error("TestData", `Failed to create test image: ${image.name}`, error);
          results.failed.push(`画像: ${image.name}`);
        }
      }

      // 2. テキストデータを作成
      const textData = [
        {
          name: "お知らせ",
          content:
            "システムメンテナンスのお知らせ 本日午後2時より、システムメンテナンスを実施いたします。ご利用の皆様にはご不便をおかけしますが、よろしくお願いいたします。",
          color: "#000000",
          backgroundColor: "#ffffff",
        },
        {
          name: "今日の天気",
          content: "今日の天気予報 晴れ時々曇り 最高気温: 25°C 最低気温: 18°C 外出時は日焼け対策をお忘れなく！",
          color: "#2c3e50",
          backgroundColor: "#ecf0f1",
        },
        {
          name: "イベント案内",
          content:
            "春の感謝祭開催！ 日時: 4月15日(土) 10:00-17:00 場所: 中央公園 楽しいイベントを多数ご用意しております。ぜひお越しください！",
          color: "#e74c3c",
          backgroundColor: "#fff3cd",
        },
        {
          name: "営業時間",
          content:
            "営業時間のご案内 平日: 9:00-18:00 土日祝: 10:00-17:00 定休日: 毎週火曜日 お問い合わせはお気軽にどうぞ。",
          color: "#27ae60",
          backgroundColor: "#d4edda",
        },
      ];

      for (const text of textData) {
        try {
          const textInfo: TextContent = {
            content: text.content,
            writingMode: "horizontal",
            fontFamily: "Noto Sans JP",
            textAlign: "start",
            color: text.color,
            backgroundColor: text.backgroundColor,
            fontSize: 32,
            scrollType: "none",
            scrollSpeed: 3,
          };

          await createTextContent(text.name, textInfo);
          results.success++;
        } catch (error) {
          logger.error("TestData", `Failed to create test text: ${text.name}`, error);
          results.failed.push(`テキスト: ${text.name}`);
        }
      }

      // 3. YouTubeデータを作成
      const youtubeData = [
        {
          name: "Big Buck Bunny",
          url: "https://www.youtube.com/watch?v=YE7VzlLtp-4",
          title: "Big Buck Bunny",
          description: "Blender オープンムービープロジェクト",
        },
        {
          name: "Sintel",
          url: "https://www.youtube.com/watch?v=eRsGyueVLvQ",
          title: "Sintel",
          description: "Blender オープンムービープロジェクト",
        },
        {
          name: "Tears of Steel",
          url: "https://www.youtube.com/watch?v=R6MlUcmOul8",
          title: "Tears of Steel",
          description: "Blender オープンムービープロジェクト",
        },
        {
          name: "Cosmos Laundromat",
          url: "https://www.youtube.com/watch?v=Y-rmzh0PI3c",
          title: "Cosmos Laundromat",
          description: "Blender オープンムービープロジェクト",
        },
      ];

      for (const youtube of youtubeData) {
        try {
          await createUrlContent(youtube.url, youtube.name, youtube.title, youtube.description);
          results.success++;
        } catch (error) {
          logger.error("TestData", `Failed to create test YouTube: ${youtube.name}`, error);
          results.failed.push(`YouTube: ${youtube.name}`);
        }
      }

      // 4. URLデータを作成
      const urlData = [
        {
          name: "Google",
          url: "https://www.google.com",
          title: "Google",
          description: "検索エンジン",
        },
        {
          name: "GitHub",
          url: "https://github.com",
          title: "GitHub",
          description: "開発者向けプラットフォーム",
        },
        {
          name: "MDN Web Docs",
          url: "https://developer.mozilla.org",
          title: "MDN Web Docs",
          description: "Web開発者向けリソース",
        },
        {
          name: "Stack Overflow",
          url: "https://stackoverflow.com",
          title: "Stack Overflow",
          description: "プログラミング質問サイト",
        },
      ];

      for (const url of urlData) {
        try {
          await createUrlContent(url.url, url.name, url.title, url.description);
          results.success++;
        } catch (error) {
          logger.error("TestData", `Failed to create test URL: ${url.name}`, error);
          results.failed.push(`URL: ${url.name}`);
        }
      }

      // 5. 気象情報データを作成
      const weatherData = [
        {
          name: "東日本の天気予報",
          locations: ["130000", "140000", "150000", "110000", "120000"], // 東京、横浜、新潟、埼玉、千葉
          weatherType: "weekly" as const,
        },
        {
          name: "西日本の天気予報",
          locations: ["270000", "280000", "340000", "400000", "430000"], // 大阪、神戸、広島、福岡、熊本
          weatherType: "weekly" as const,
        },
      ];

      for (const weather of weatherData) {
        try {
          const weatherInfo: WeatherContent = {
            locations: weather.locations,
            weatherType: weather.weatherType,
            apiUrl: "https://jma-proxy.deno.dev",
          };

          await createWeatherContent(weather.name, weatherInfo);
          results.success++;
        } catch (error) {
          logger.error("TestData", `Failed to create test weather: ${weather.name}`, error);
          results.failed.push(`気象情報: ${weather.name}`);
        }
      }

      // 6. CSVデータを作成
      const csvData = [
        {
          name: "月間売上データ",
          csvContent: `商品名,1月,2月,3月,4月,5月,6月
商品A,120,150,180,200,220,250
商品B,80,90,100,110,120,130
商品C,200,210,220,230,240,250
商品D,50,60,70,80,90,100
合計,450,510,570,620,670,730`,
          selectedRows: [0, 1, 2, 3, 4, 5],
          selectedColumns: [0, 1, 2, 3, 4, 5, 6],
        },
        {
          name: "年間成績表",
          csvContent: `科目,前期中間,前期期末,後期中間,後期期末,平均
国語,85,88,90,92,88.75
数学,92,94,96,98,95
英語,78,82,85,88,83.25
理科,88,90,92,94,91
社会,82,85,88,90,86.25`,
          selectedRows: [0, 1, 2, 3, 4, 5],
          selectedColumns: [0, 1, 2, 3, 4, 5],
        },
      ];

      for (const csv of csvData) {
        try {
          // CSVファイルオブジェクトを作成
          const csvBlob = new Blob([csv.csvContent], { type: "text/csv" });
          const csvFile = new File([csvBlob], `${csv.name}.csv`, { type: "text/csv" });

          const csvInfo: Partial<CsvContent> = {
            originalCsvData: csv.csvContent,
            selectedRows: csv.selectedRows,
            selectedColumns: csv.selectedColumns,
            layout: {
              table: { width: 1200, height: 800, x: 360, y: 140 },
              columns: { widths: "auto", alignment: [] },
              rows: { headerHeight: 50, rowHeight: 40 },
              padding: { cell: 10, table: 20 },
            },
            style: {
              font: { family: "Noto Sans CJK JP", size: 14, color: "#000000" },
              header: { backgroundColor: "#f0f0f0", fontWeight: "bold", color: "#000000" },
              table: { borderWidth: 1, borderColor: "#cccccc", backgroundColor: "rgba(255, 255, 255, 0.9)" },
              cell: { borderWidth: 1, borderColor: "#e0e0e0" },
            },
            format: "png",
          };

          // CSVファイルを引数として渡す
          await createCsvContent(csv.name, csvInfo, undefined, csvFile);
          results.success++;
        } catch (error) {
          logger.error("TestData", `Failed to create test CSV: ${csv.name}`, error);
          results.failed.push(`CSV: ${csv.name}`);
        }
      }

      return results;
    } catch (error) {
      logger.error("TestData", "Failed to create test data", error);
      throw new Error(`テストデータの作成に失敗しました: ${error}`);
    }
  }, [
    createTestImageData,
    createTextContent,
    createUrlContent,
    createFileContent,
    createWeatherContent,
    createCsvContent,
  ]);

  return {
    createTestData,
  };
};
