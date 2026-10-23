'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  Banknote,
  QrCode,
  Upload,
  Copy,
  Check,
  Eye,
  X,
  FileCheck2,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { PaymentMethod, StoreSettings } from '@/types';

interface PaymentSectionProps {
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  screenshot: string | null;
  onScreenshotChange: (screenshotUrl: string | null) => void;
  refNumber: string;
  onRefNumberChange: (ref: string) => void;
  totalAmount: number;
  settings: StoreSettings;
}

export default function PaymentSection({
  paymentMethod,
  onPaymentMethodChange,
  screenshot,
  onScreenshotChange,
  refNumber,
  onRefNumberChange,
  totalAmount,
  settings,
}: PaymentSectionProps) {
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText(settings.gcash.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        onScreenshotChange(data.url);
      }
    } catch (err) {
      console.error('Failed to upload screenshot', err);
      // Fallback: Read as data URL directly on client
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        onScreenshotChange(uploadEvent.target?.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
          <Banknote className="w-4 h-4" />
        </div>
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Payment Method</h3>
          <p className="text-[11px] text-slate-500">
            Select Cash on Delivery or Pay via GCash / QR Ph
          </p>
        </div>
      </div>

      {/* Payment Method Selector Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* COD Card */}
        <button
          type="button"
          onClick={() => onPaymentMethodChange('COD')}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
            paymentMethod === 'COD'
              ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Banknote className="w-4 h-4" />
            </div>
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                paymentMethod === 'COD'
                  ? 'border-orange-600 bg-orange-600 text-white'
                  : 'border-slate-300'
              }`}
            >
              {paymentMethod === 'COD' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            </span>
          </div>
          <div className="mt-2">
            <span className="font-bold text-slate-900 text-xs block">
              Cash on Delivery (COD)
            </span>
            <span className="text-[10px] text-slate-500">
              Pay upon doorstep tank delivery
            </span>
          </div>
        </button>

        {/* GCash QR Card */}
        <button
          type="button"
          onClick={() => onPaymentMethodChange('GCASH_QR')}
          className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
            paymentMethod === 'GCASH_QR'
              ? 'border-orange-500 bg-orange-50/50 ring-1 ring-orange-500'
              : 'border-slate-200 hover:border-slate-300 bg-white'
          }`}
        >
          <div className="flex items-center justify-between w-full">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <span
              className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                paymentMethod === 'GCASH_QR'
                  ? 'border-orange-600 bg-orange-600 text-white'
                  : 'border-slate-300'
              }`}
            >
              {paymentMethod === 'GCASH_QR' && (
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              )}
            </span>
          </div>
          <div className="mt-2">
            <span className="font-bold text-slate-900 text-xs block">
              GCash / Maya QR Ph
            </span>
            <span className="text-[10px] text-slate-500">
              Scan & upload payment screenshot
            </span>
          </div>
        </button>
      </div>

      {/* GCash / QR Details & Screenshot Upload Workflow */}
      {paymentMethod === 'GCASH_QR' && (
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-blue-50/70 via-white to-blue-50/40 border border-blue-200 space-y-4">
          <div className="flex items-start gap-3">
            {/* Clickable QR Code Thumbnail */}
            <div
              onClick={() => setShowQrModal(true)}
              className="relative w-24 h-24 rounded-xl border-2 border-blue-400 bg-white p-1 cursor-pointer group shadow-sm hover:scale-105 transition-transform shrink-0"
            >
              <Image
                src={settings.gcash.qrImageUrl}
                alt="Store QR Code"
                fill
                className="object-contain p-1 rounded-lg"
              />
              <div className="absolute inset-0 bg-blue-900/40 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-5 h-5" />
              </div>
            </div>

            {/* Account Details & Instructions */}
            <div className="flex-1 text-xs">
              <span className="inline-block px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-extrabold uppercase mb-1">
                Store Owner QR Ph
              </span>
              <p className="font-bold text-slate-900 text-sm">
                {settings.gcash.accountName}
              </p>
              
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-slate-700 font-semibold bg-white px-2 py-1 rounded border border-blue-200">
                  {settings.gcash.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold text-[10px] transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-2 text-slate-600">
                Amount to Pay: <strong className="text-orange-600 text-sm font-black">₱{totalAmount.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Screenshot Upload Dropzone */}
          <div className="pt-2 border-t border-blue-200/80">
            <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
              <span>
                Upload Payment Screenshot <span className="text-red-500">*</span>
              </span>
              <span className="text-[10px] text-slate-500 font-normal">
                (GCash / Maya transaction receipt)
              </span>
            </label>

            {!screenshot ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-blue-300 hover:border-orange-500 bg-white hover:bg-orange-50/20 rounded-xl p-4 text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Upload className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-800">
                    {isUploading ? 'Uploading screenshot...' : 'Tap to upload screenshot receipt'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Supports JPG, PNG, Screenshots from mobile
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-xl border border-emerald-300 bg-emerald-50/50 p-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-14 rounded-lg overflow-hidden border border-emerald-400 shrink-0 bg-white">
                    <Image
                      src={screenshot}
                      alt="Payment Screenshot"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                      <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                      Screenshot Attached
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Ready for store owner confirmation
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onScreenshotChange(null)}
                  className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 transition"
                  title="Remove screenshot"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Optional Reference Number */}
            <div className="mt-2.5">
              <input
                type="text"
                value={refNumber}
                onChange={(e) => onRefNumberChange(e.target.value)}
                placeholder="Reference No. (e.g. 1002 9482 1293) — Optional"
                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:border-blue-500 text-xs text-slate-900 outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cash on Delivery Notice */}
      {paymentMethod === 'COD' && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Cash on Delivery Ready</span>
            <p className="text-[11px] text-emerald-700">
              Please prepare exact amount <strong>₱{totalAmount.toLocaleString()}</strong>. Our rider will test the cylinder seal and flame upon arrival.
            </p>
          </div>
        </div>
      )}

      {/* QR Modal for easy full-screen scanning */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 relative shadow-2xl animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowQrModal(false)}
              className="absolute top-3 right-3 p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-3">
              <h4 className="font-bold text-slate-900 text-base">
                Regasco Mindanao Ave.
              </h4>
              <p className="text-xs text-slate-500">
                Scan using GCash, Maya, or any QR Ph banking app
              </p>
            </div>
            <div className="relative w-full aspect-square rounded-xl overflow-hidden border p-2 bg-slate-50">
              <Image
                src={settings.gcash.qrImageUrl}
                alt="Store QR Code Full"
                fill
                className="object-contain"
              />
            </div>
            <div className="mt-3 text-center">
              <span className="font-mono font-bold text-sm text-blue-900">
                {settings.gcash.accountNumber}
              </span>
              <p className="text-[11px] text-slate-400">
                Account: {settings.gcash.accountName}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
