'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UploadModeSelector } from '@/components/upload/UploadModeSelector';
import { CarrierWarningBanner } from '@/components/upload/CarrierWarningBanner';
import { PreUploadAnalysis } from '@/components/upload/PreUploadAnalysis';
import { ConfirmUploadDialog } from '@/components/upload/ConfirmUploadDialog';
import { UploadHistoryDisplay } from '@/components/upload/UploadHistory';
import { ManualColumnMapper } from '@/components/upload/ManualColumnMapper';
import { FileTypeIndicator } from '@/components/upload/FileTypeIndicator';
import type { UploadMode, AnalysisResult, UploadResultExtended } from '@/types';
import type { ParseResult, ColumnMapping, ParsedInvoice } from '@/lib/parsing/types';
import { parseFile, applyManualMapping } from '@/lib/parsing/file-parser';
import {
  Upload,
  FileSpreadsheet,
  Check,
  X,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Plus,
  RefreshCw,
  SkipForward,
  Ban,
  Truck,
} from 'lucide-react';

type Step = 'upload' | 'mapping' | 'mode' | 'analysis' | 'results';

export default function InvoiceUploadPage() {
  // Step management
  const [step, setStep] = useState<Step>('upload');

  // Step 1: File and carrier selection
  const [carrier, setCarrier] = useState<'dhl' | 'royalmail'>('dhl');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedInvoice[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  // Step 2: Upload mode selection
  const [uploadMode, setUploadMode] = useState<UploadMode>('overwrite_all');

  // Step 3: Analysis
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Step 4: Results
  const [uploadResults, setUploadResults] = useState<UploadResultExtended[]>([]);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    created: number;
    updated: number;
    skipped: number;
    errors: number;
    blocked: number;
  } | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Reset parse result when new file selected
      setParseResult(null);
    }
  };

  const handlePreview = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const result = await parseFile(file);
      setParseResult(result);

      if (!result.success) {
        alert(result.error || 'Failed to parse file');
        return;
      }

      // Check if manual mapping is needed
      if (result.needsManualMapping) {
        setStep('mapping');
        return;
      }

      // Success - move to mode selection
      setParsedData(result.data);
      setStep('mode');
    } catch (error) {
      console.error('Error parsing file:', error);
      alert('Error parsing file. Please check the format.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualMappingConfirm = (mapping: ColumnMapping) => {
    if (!parseResult) return;

    const updatedResult = applyManualMapping(parseResult, mapping);
    setParseResult(updatedResult);

    if (updatedResult.data.length > 0) {
      setParsedData(updatedResult.data);
      setStep('mode');
    } else {
      alert('No valid data rows found after mapping. Please check your column selection.');
    }
  };

  const handleManualMappingCancel = () => {
    setParseResult(null);
    setStep('upload');
  };

  const handleAnalyze = async () => {
    if (parsedData.length === 0) return;

    setAnalyzing(true);
    try {
      const response = await fetch('/api/invoices/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoices: parsedData,
          carrier,
          uploadMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze invoices');
      }

      const result = await response.json();
      setAnalysis(result);
      setStep('analysis');
    } catch (error) {
      console.error('Error analyzing:', error);
      alert('Error analyzing invoices. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!analysis) return;

    setLoading(true);
    try {
      const response = await fetch('/api/invoices/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          records: analysis.records,
          carrier,
          uploadMode,
          fileName: file?.name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to process upload');
      }

      const result = await response.json();
      setUploadResults(result.results);
      setUploadSummary(result.summary);
      setShowConfirmDialog(false);
      setStep('results');
    } catch (error) {
      console.error('Error processing:', error);
      alert('Error processing upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setParseResult(null);
    setUploadMode('overwrite_all');
    setAnalysis(null);
    setUploadResults([]);
    setUploadSummary(null);
    setStep('upload');
  };

  const goBack = () => {
    if (step === 'mapping') setStep('upload');
    else if (step === 'mode') {
      // If we came from manual mapping, go back there
      if (parseResult?.needsManualMapping) {
        setStep('mapping');
      } else {
        setStep('upload');
      }
    }
    else if (step === 'analysis') setStep('mode');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/shipping" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Truck className="h-6 w-6" />
              Upload Carrier Invoice
            </h1>
          </div>
          <p className="text-muted-foreground">
            Import shipping costs from carrier invoices
          </p>
        </div>
      </div>

      <div className="max-w-4xl">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-6">
          {(() => {
            // Dynamic steps based on whether mapping is needed
            const steps = parseResult?.needsManualMapping
              ? ['upload', 'mapping', 'mode', 'analysis', 'results']
              : ['upload', 'mode', 'analysis', 'results'];
            const currentIndex = steps.indexOf(step);

            return steps.map((s, index) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-primary text-primary-foreground'
                      : currentIndex > index
                      ? 'bg-green-500 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {currentIndex > index ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 md:w-20 h-1 mx-2 ${
                      currentIndex > index
                        ? 'bg-green-500'
                        : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ));
          })()}
        </div>

        {/* Step 1: Upload */}
        {step === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Select Carrier & File</CardTitle>
              <CardDescription>
                Upload a carrier invoice file to update shipping costs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Carrier</label>
                <Select value={carrier} onValueChange={(v) => setCarrier(v as 'dhl' | 'royalmail')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dhl">DHL Express</SelectItem>
                    <SelectItem value="royalmail">Royal Mail</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <CarrierWarningBanner carrier={carrier} />

              <div className="space-y-2">
                <label className="text-sm font-medium">Invoice File</label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer flex flex-col items-center"
                  >
                    {file ? (
                      <>
                        <FileSpreadsheet className="h-12 w-12 text-primary mb-2" />
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                        {parseResult && (
                          <div className="mt-2">
                            <FileTypeIndicator fileType={parseResult.fileType} />
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="font-medium">Click to upload file</p>
                        <p className="text-sm text-muted-foreground">CSV, Excel (.xlsx/.xls), or PDF</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">Supported formats:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li><strong>CSV</strong> - Comma-separated values</li>
                  <li><strong>Excel</strong> - .xlsx or .xls files</li>
                  <li><strong>PDF</strong> - Tabular invoice PDFs (not scanned images)</li>
                </ul>
                <p className="mt-3 font-medium mb-2">Expected columns:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Tracking number (AWB, Reference, Barcode) - <strong>Required</strong></li>
                  <li>Cost/Charge/Amount - <strong>Required</strong></li>
                  <li>Date, Service type, Weight, Currency (optional)</li>
                </ul>
              </div>

              <Button onClick={handlePreview} disabled={!file || loading} className="w-full">
                {loading ? 'Processing...' : 'Continue'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1.5: Manual Column Mapping (when needed) */}
        {step === 'mapping' && parseResult && (
          <ManualColumnMapper
            headers={parseResult.headers}
            rawRows={parseResult.rawRows}
            initialMapping={parseResult.columnMapping}
            onConfirm={handleManualMappingConfirm}
            onCancel={handleManualMappingCancel}
          />
        )}

        {/* Step 2: Upload Mode */}
        {step === 'mode' && (
          <div className="space-y-4">
            {/* Parse Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-500" />
                  File Parsed Successfully
                </CardTitle>
                <CardDescription>
                  {file?.name && (
                    <span className="flex items-center gap-2">
                      {file.name}
                      {parseResult && <FileTypeIndicator fileType={parseResult.fileType} />}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">{parsedData.length}</p>
                    <p className="text-sm text-muted-foreground">Records Found</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-4 text-center">
                    <p className="text-2xl font-bold">
                      £{parsedData.reduce((sum, r) => sum + r.shipping_cost, 0).toFixed(2)}
                    </p>
                    <p className="text-sm text-muted-foreground">Total Cost</p>
                  </div>
                </div>
                {parseResult?.warnings && parseResult.warnings.length > 0 && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800 mb-1">Warnings:</p>
                    <ul className="text-sm text-amber-700 list-disc list-inside">
                      {parseResult.warnings.slice(0, 5).map((warning, i) => (
                        <li key={i}>{warning}</li>
                      ))}
                      {parseResult.warnings.length > 5 && (
                        <li>...and {parseResult.warnings.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <UploadModeSelector value={uploadMode} onChange={setUploadMode} />

            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleAnalyze} disabled={analyzing} className="flex-1">
                {analyzing ? 'Analyzing...' : 'Analyze Upload'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Analysis */}
        {step === 'analysis' && analysis && (
          <div className="space-y-4">
            <PreUploadAnalysis analysis={analysis} />

            <div className="flex gap-2">
              <Button variant="outline" onClick={goBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button
                onClick={() => setShowConfirmDialog(true)}
                disabled={analysis.toCreate === 0 && analysis.toUpdate === 0}
                className="flex-1"
              >
                <Upload className="h-4 w-4 mr-2" />
                {analysis.toCreate === 0 && analysis.toUpdate === 0
                  ? 'Nothing to Upload'
                  : `Process ${analysis.toCreate + analysis.toUpdate} Records`}
              </Button>
            </div>

            <ConfirmUploadDialog
              open={showConfirmDialog}
              onOpenChange={setShowConfirmDialog}
              analysis={analysis}
              uploadMode={uploadMode}
              carrier={carrier}
              onConfirm={handleConfirmUpload}
              loading={loading}
            />
          </div>
        )}

        {/* Step 4: Results */}
        {step === 'results' && uploadSummary && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Complete</CardTitle>
              <CardDescription>
                {uploadSummary.created + uploadSummary.updated} of {uploadSummary.total} records processed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <div className="bg-muted/50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{uploadSummary.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{uploadSummary.created}</p>
                  <p className="text-sm text-green-700">Created</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{uploadSummary.updated}</p>
                  <p className="text-sm text-blue-700">Updated</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-600">{uploadSummary.skipped}</p>
                  <p className="text-sm text-gray-700">Skipped</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{uploadSummary.blocked}</p>
                  <p className="text-sm text-red-700">Blocked</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{uploadSummary.errors}</p>
                  <p className="text-sm text-red-700">Errors</p>
                </div>
              </div>

              {/* Detailed results */}
              <div className="max-h-[400px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Tracking Number</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">
                          {result.tracking_number}
                        </TableCell>
                        <TableCell>
                          {result.action === 'created' && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              <Plus className="h-3 w-3 mr-1" />
                              Created
                            </Badge>
                          )}
                          {result.action === 'updated' && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              <RefreshCw className="h-3 w-3 mr-1" />
                              Updated
                            </Badge>
                          )}
                          {result.action === 'skipped' && (
                            <Badge variant="secondary">
                              <SkipForward className="h-3 w-3 mr-1" />
                              Skipped
                            </Badge>
                          )}
                          {result.action === 'blocked' && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <Ban className="h-3 w-3 mr-1" />
                              Blocked
                            </Badge>
                          )}
                          {result.action === 'error' && (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.status === 'success' && (
                            <Badge className="bg-green-100 text-green-800">
                              <Check className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          )}
                          {result.status === 'not_found' && (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Not Found
                            </Badge>
                          )}
                          {result.status === 'skipped' && (
                            <Badge variant="secondary">
                              <SkipForward className="h-3 w-3 mr-1" />
                              Skipped
                            </Badge>
                          )}
                          {result.status === 'blocked' && (
                            <Badge className="bg-red-100 text-red-800">
                              <Ban className="h-3 w-3 mr-1" />
                              Blocked
                            </Badge>
                          )}
                          {result.status === 'error' && (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              Error
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {result.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button onClick={resetUpload} className="w-full">
                Upload Another Invoice
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Upload History - Always visible at the bottom */}
        <div className="mt-8">
          <UploadHistoryDisplay limit={10} />
        </div>
      </div>
    </div>
  );
}
