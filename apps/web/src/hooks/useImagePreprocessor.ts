"use client";

import { useState, useCallback } from "react";
import {
  processImage,
  type ProcessOptions,
  type ProcessResult,
  type ProcessWarning,
  type ProcessStep,
  type ValidationError,
} from "@/lib/image-processing";

interface UseImagePreprocessorOptions {
  maxDimension?: number;
  quality?: number;
  maxFileSize?: number;
  minDimension?: number;
  detectFace?: boolean;
}

interface UseImagePreprocessorReturn {
  processFile: (file: File) => Promise<ProcessResult | null>;
  processFiles: (files: File[]) => Promise<(ProcessResult | null)[]>;
  processing: boolean;
  currentStep: ProcessStep | null;
  errors: ValidationError[];
  warnings: ProcessWarning[];
  reset: () => void;
}

export function useImagePreprocessor(
  options?: UseImagePreprocessorOptions,
): UseImagePreprocessorReturn {
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<ProcessStep | null>(null);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [warnings, setWarnings] = useState<ProcessWarning[]>([]);

  const opts: ProcessOptions = {
    maxDimension: options?.maxDimension,
    quality: options?.quality,
    maxFileSize: options?.maxFileSize,
    minDimension: options?.minDimension,
    detectFace: options?.detectFace,
  };

  const processFile = useCallback(
    async (file: File): Promise<ProcessResult | null> => {
      setProcessing(true);
      setErrors([]);
      setWarnings([]);
      setCurrentStep(null);

      try {
        const output = await processImage(file, opts, setCurrentStep);

        if ("errors" in output) {
          setErrors(output.errors);
          return null;
        }

        setWarnings(output.result.warnings);
        return output.result;
      } catch {
        setErrors([{ type: "invalid-image" }]);
        return null;
      } finally {
        setProcessing(false);
        setCurrentStep(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      options?.maxDimension,
      options?.quality,
      options?.maxFileSize,
      options?.minDimension,
      options?.detectFace,
    ],
  );

  const processFiles = useCallback(
    async (files: File[]): Promise<(ProcessResult | null)[]> => {
      setProcessing(true);
      setErrors([]);
      setWarnings([]);

      try {
        const results = await Promise.all(
          files.map((f) => processImage(f, opts, setCurrentStep)),
        );

        const allErrors: ValidationError[] = [];
        const allWarnings: ProcessWarning[] = [];
        const out: (ProcessResult | null)[] = [];

        for (const r of results) {
          if ("errors" in r) {
            allErrors.push(...r.errors);
            out.push(null);
          } else {
            allWarnings.push(...r.result.warnings);
            out.push(r.result);
          }
        }

        setErrors(allErrors);
        setWarnings(allWarnings);
        return out;
      } catch {
        setErrors([{ type: "invalid-image" }]);
        return files.map(() => null);
      } finally {
        setProcessing(false);
        setCurrentStep(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      options?.maxDimension,
      options?.quality,
      options?.maxFileSize,
      options?.minDimension,
      options?.detectFace,
    ],
  );

  const reset = useCallback(() => {
    setProcessing(false);
    setCurrentStep(null);
    setErrors([]);
    setWarnings([]);
  }, []);

  return { processFile, processFiles, processing, currentStep, errors, warnings, reset };
}
