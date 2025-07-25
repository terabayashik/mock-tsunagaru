import { Box, Button, Checkbox, FileInput, Group, Paper, ScrollArea, Stack, Table, Text, Title } from "@mantine/core";
import { IconFile, IconTableOptions, IconUpload } from "@tabler/icons-react";
import { memo, useCallback, useEffect, useState } from "react";
import type { CsvContent, CsvLayoutConfig, CsvStyleConfig } from "~/types/content";
import { type ParsedCsv, parseCsvFile } from "~/utils/csvParser";
import { CsvLayoutForm } from "./CsvLayoutForm";
import { CsvStyleForm } from "./CsvStyleForm";

interface CsvContentFormProps {
  initialData?: Partial<CsvContent>;
  onDataChange: (data: Partial<CsvContent>) => void;
  onPreviewRequest?: () => void;
  onBackgroundFileChange?: (file: File | undefined) => void;
}

export const CsvContentForm = memo(
  ({ initialData, onDataChange, onPreviewRequest, onBackgroundFileChange }: CsvContentFormProps) => {
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedCsv, setParsedCsv] = useState<ParsedCsv | null>(null);
    const [selectedRows, setSelectedRows] = useState<number[]>(initialData?.selectedRows || []);
    const [selectedColumns, setSelectedColumns] = useState<number[]>(initialData?.selectedColumns || []);
    const [layout, setLayout] = useState<CsvLayoutConfig | undefined>(initialData?.layout);
    const [style, setStyle] = useState<CsvStyleConfig | undefined>(initialData?.style);
    const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

    // CSVファイルの解析
    const handleCsvUpload = useCallback(
      async (file: File | null) => {
        if (!file) {
          setCsvFile(null);
          setParsedCsv(null);
          setSelectedRows([]);
          setSelectedColumns([]);
          return;
        }

        try {
          setCsvFile(file);
          const parsed = await parseCsvFile(file);
          setParsedCsv(parsed);

          // デフォルトで全ての行と列を選択
          const allRows = Array.from({ length: parsed.totalRows }, (_, i) => i);
          const allColumns = Array.from({ length: parsed.totalColumns }, (_, i) => i);
          setSelectedRows(allRows);
          setSelectedColumns(allColumns);

          // CSVデータを親コンポーネントに通知
          onDataChange({
            originalCsvData: await file.text(),
            selectedRows: allRows,
            selectedColumns: allColumns,
          });
        } catch (error) {
          console.error("Failed to parse CSV:", error);
        }
      },
      [onDataChange],
    );

    // 行の選択/解除
    const toggleRow = useCallback((rowIndex: number) => {
      setSelectedRows((prev) => {
        const newRows = prev.includes(rowIndex)
          ? prev.filter((i) => i !== rowIndex)
          : [...prev, rowIndex].sort((a, b) => a - b);
        return newRows;
      });
    }, []);

    // 列の選択/解除
    const toggleColumn = useCallback((colIndex: number) => {
      setSelectedColumns((prev) => {
        const newCols = prev.includes(colIndex)
          ? prev.filter((i) => i !== colIndex)
          : [...prev, colIndex].sort((a, b) => a - b);
        return newCols;
      });
    }, []);

    // 全行選択/解除
    const toggleAllRows = useCallback(() => {
      if (!parsedCsv) return;

      if (selectedRows.length === parsedCsv.totalRows) {
        setSelectedRows([]);
      } else {
        setSelectedRows(Array.from({ length: parsedCsv.totalRows }, (_, i) => i));
      }
    }, [parsedCsv, selectedRows]);

    // 全列選択/解除
    const toggleAllColumns = useCallback(() => {
      if (!parsedCsv) return;

      if (selectedColumns.length === parsedCsv.totalColumns) {
        setSelectedColumns([]);
      } else {
        setSelectedColumns(Array.from({ length: parsedCsv.totalColumns }, (_, i) => i));
      }
    }, [parsedCsv, selectedColumns]);

    // データ変更を親コンポーネントに通知
    useEffect(() => {
      if (parsedCsv) {
        onDataChange({
          selectedRows,
          selectedColumns,
          layout,
          style,
        });
      }
    }, [selectedRows, selectedColumns, layout, style, parsedCsv, onDataChange]);

    return (
      <Stack gap="lg">
        {/* CSVファイルアップロード */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Group justify="space-between">
              <Title order={4}>CSVファイル</Title>
              {csvFile && (
                <Text size="sm" c="dimmed">
                  {csvFile.name}
                </Text>
              )}
            </Group>
            <FileInput
              accept=".csv,text/csv"
              placeholder="CSVファイルを選択"
              value={csvFile}
              onChange={handleCsvUpload}
              leftSection={<IconFile size={16} />}
              rightSection={
                csvFile && (
                  <Button size="xs" variant="subtle" onClick={() => handleCsvUpload(null)}>
                    クリア
                  </Button>
                )
              }
            />
          </Stack>
        </Paper>

        {/* CSVデータプレビューと選択 */}
        {parsedCsv && (
          <Paper p="md" withBorder>
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>データ選択</Title>
                <Group gap="xs">
                  <Text size="sm" c="dimmed">
                    {selectedRows.length}/{parsedCsv.totalRows} 行, {selectedColumns.length}/{parsedCsv.totalColumns} 列
                  </Text>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<IconTableOptions size={14} />}
                    onClick={onPreviewRequest}
                  >
                    プレビュー
                  </Button>
                </Group>
              </Group>

              <ScrollArea h={400}>
                <Table striped highlightOnHover withTableBorder withColumnBorders>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th w={40}>
                        <Checkbox
                          checked={selectedRows.length === parsedCsv.totalRows}
                          indeterminate={selectedRows.length > 0 && selectedRows.length < parsedCsv.totalRows}
                          onChange={toggleAllRows}
                        />
                      </Table.Th>
                      {parsedCsv.headers.map((header, colIndex) => (
                        <Table.Th key={`col-${colIndex}-${header}`}>
                          <Group gap="xs" wrap="nowrap">
                            <Checkbox
                              checked={selectedColumns.includes(colIndex)}
                              onChange={() => toggleColumn(colIndex)}
                            />
                            <Text size="sm" truncate>
                              {header || `列${colIndex + 1}`}
                            </Text>
                          </Group>
                        </Table.Th>
                      ))}
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {parsedCsv.rows.map((row, rowIndex) => (
                      <Table.Tr
                        key={`row-${rowIndex}-${row.join("-").substring(0, 20)}`}
                        bg={selectedRows.includes(rowIndex) ? "blue.0" : undefined}
                      >
                        <Table.Td>
                          <Checkbox checked={selectedRows.includes(rowIndex)} onChange={() => toggleRow(rowIndex)} />
                        </Table.Td>
                        {row.map((cell, colIndex) => (
                          <Table.Td
                            key={`cell-${rowIndex}-${colIndex}-${cell.substring(0, 10)}`}
                            bg={
                              selectedColumns.includes(colIndex)
                                ? selectedRows.includes(rowIndex)
                                  ? "blue.1"
                                  : "gray.0"
                                : undefined
                            }
                          >
                            <Text size="sm" truncate>
                              {cell}
                            </Text>
                          </Table.Td>
                        ))}
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>

              <Group gap="xs">
                <Button size="xs" variant="light" onClick={toggleAllColumns}>
                  全列選択/解除
                </Button>
              </Group>
            </Stack>
          </Paper>
        )}

        {/* レイアウト設定 */}
        {parsedCsv && (
          <CsvLayoutForm initialLayout={layout} onLayoutChange={setLayout} selectedColumns={selectedColumns.length} />
        )}

        {/* スタイル設定 */}
        {parsedCsv && <CsvStyleForm initialStyle={style} onStyleChange={setStyle} />}

        {/* 背景画像アップロード */}
        <Paper p="md" withBorder>
          <Stack gap="sm">
            <Title order={4}>背景画像（オプション）</Title>
            <FileInput
              accept="image/jpeg,image/jpg,image/png"
              placeholder="背景画像を選択"
              value={backgroundFile}
              onChange={(file) => {
                setBackgroundFile(file);
                onBackgroundFileChange?.(file || undefined);
              }}
              leftSection={<IconUpload size={16} />}
              rightSection={
                backgroundFile && (
                  <Button
                    size="xs"
                    variant="subtle"
                    onClick={() => {
                      setBackgroundFile(null);
                      onBackgroundFileChange?.(undefined);
                    }}
                  >
                    クリア
                  </Button>
                )
              }
            />
            {backgroundFile && (
              <Box>
                <img
                  src={URL.createObjectURL(backgroundFile)}
                  alt="背景プレビュー"
                  style={{ maxWidth: 200, maxHeight: 150, objectFit: "contain" }}
                />
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>
    );
  },
);

CsvContentForm.displayName = "CsvContentForm";
