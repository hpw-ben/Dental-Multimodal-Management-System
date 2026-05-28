"use client"



import React, { useState } from 'react';

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";

import { Upload, FileImage, Trash2, Loader2, FolderOpen, Archive } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";


import { DicomViewport } from './dicom-viewport';

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { getImagingFilesByPatientApi, uploadImagingFileApi, deleteImagingFileApi, uploadZipApi } from "@/lib/api/imaging-files";

import type { ImagingFile } from "@/lib/api/imaging-files";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";



type GalleryImage = {

    id: string;

    name: string;

    url: string;

    type: 'dicom-series' | 'image';

    count?: number;

};



interface ImageGalleryProps {

    patientId?: string;

}



export function ImageGallery({ patientId }: ImageGalleryProps) {

    const queryClient = useQueryClient();

    

    // 获取患者影像文件

    const { data: imagingFiles = [], isLoading } = useQuery({

        queryKey: ['imagingFiles', patientId],

        queryFn: () => getImagingFilesByPatientApi(patientId!),

        enabled: !!patientId,

    });

    

    // 上传影像文件

    const uploadMutation = useMutation({

        mutationFn: ({ file, seriesName }: { file: File; seriesName?: string }) => 

            uploadImagingFileApi(patientId!, file, seriesName),

        // 不在 onSuccess 中刷新，避免每次上传都触发刷新导致重复

        onError: (error: unknown) => {

            const err = error as { message?: string };

            toast.error(`上传失败：${err.message || '请稍后重试'}`);

        },

    });

    

    // 删除影像文件

    const deleteMutation = useMutation({

        mutationFn: (id: string) => deleteImagingFileApi(id),

        onSuccess: () => {

            queryClient.invalidateQueries({ queryKey: ['imagingFiles', patientId] });

        },

        onError: (error: unknown) => {

            const err = error as { message?: string };

            toast.error(`删除失败：${err.message || '请稍后重试'}`);

        },

    });

    

    // 将后端数据转换为 GalleryImage 格式，并按 series_name 分组

    // 同时保存 series 到文件列表的映射

    const [seriesFilesMap, images] = React.useMemo(() => {

        // 按 series_name 分组

        const seriesMap = new Map<string, ImagingFile[]>();

        const singleFiles: ImagingFile[] = [];

        

        imagingFiles.forEach((file: ImagingFile) => {

            if (file.series_name && file.file_name.toLowerCase().endsWith('.dcm')) {

                // 有 series_name 的 DICOM 文件，加入分组

                if (!seriesMap.has(file.series_name)) {

                    seriesMap.set(file.series_name, []);

                }

                seriesMap.get(file.series_name)!.push(file);

            } else {

                // 没有 series_name 的文件，单独显示

                singleFiles.push(file);

            }

        });

        

        const result: GalleryImage[] = [];

        

        // 添加分组的 DICOM series

        seriesMap.forEach((files, seriesName) => {

            if (files.length > 0) {

                // 按文件名排序

                files.sort((a, b) => a.file_name.localeCompare(b.file_name));

                result.push({

                    id: seriesName,

                    name: `${seriesName} (${files.length} 张)`,

                    url: files[0].file_url || '',

                    type: 'dicom-series',

                    count: files.length,

                });

            }

        });

        

        // 添加单独的文件

        singleFiles.forEach((file: ImagingFile) => {

            result.push({

                id: file.id,

                name: file.file_name,

                url: file.file_url || '',

                type: file.file_name.toLowerCase().endsWith('.dcm') ? 'dicom-series' : 'image',

                count: 1,

            });

        });

        

        return [seriesMap, result];

    }, [imagingFiles]);

    const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const folderInputRef = React.useRef<HTMLInputElement>(null);
    const zipInputRef = React.useRef<HTMLInputElement>(null);



    // 上传一批文件的通用逻辑
    const uploadFiles = async (fileArray: File[]) => {
        if (!patientId || fileArray.length === 0) return;

        const VALID_EXTS = ['.dcm', '.jpg', '.jpeg', '.png'];
        const validFiles = fileArray.filter(f => VALID_EXTS.some(ext => f.name.toLowerCase().endsWith(ext)));
        if (validFiles.length === 0) {
            toast.error('没有可上传的有效文件（支持 .dcm .jpg .png .jpeg）');
            return;
        }

        const dicomFiles = validFiles.filter(f => f.name.toLowerCase().endsWith('.dcm'));
        const imageFiles = validFiles.filter(f => !f.name.toLowerCase().endsWith('.dcm'));

        let seriesName = '';
        if (dicomFiles.length > 1) {
            const now = new Date();
            const tag = `${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
            seriesName = `S_${tag}`;
        }

        try {
            for (const file of dicomFiles) {
                await uploadMutation.mutateAsync({ file, seriesName });
            }
            for (const file of imageFiles) {
                await uploadMutation.mutateAsync({ file, seriesName: '' });
            }
            queryClient.invalidateQueries({ queryKey: ['imagingFiles', patientId] });
            toast.success(`上传完成，共 ${validFiles.length} 个文件`);
        } catch (error) {
            console.error('上传失败', error);
        }
    };

    // 普通文件上传
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        await uploadFiles(Array.from(files));
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // 文件夹上传：优先使用 showDirectoryPicker，失败则回退到 webkitdirectory input
    const handleFolderUpload = async () => {
        // 检查浏览器是否支持 showDirectoryPicker
        if ('showDirectoryPicker' in window) {
            try {
                // @ts-expect-error showDirectoryPicker 是较新的 API
                const dirHandle = await window.showDirectoryPicker();
                const files: File[] = [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const readDir = async (handle: any) => {
                    for await (const entry of handle.values()) {
                        if (entry.kind === 'file') {
                            files.push(await entry.getFile());
                        } else if (entry.kind === 'directory') {
                            await readDir(entry);
                        }
                    }
                };
                await readDir(dirHandle);
                await uploadFiles(files);
                return;
            } catch (error) {
                if ((error as DOMException)?.name === 'AbortError') return;
                // showDirectoryPicker 失败，回退到 input
            }
        }
        // Fallback: 使用 webkitdirectory input
        folderInputRef.current?.click();
    };

    const handleFolderFallback = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        await uploadFiles(Array.from(files));
        if (folderInputRef.current) folderInputRef.current.value = '';
    };

    // 压缩包上传（后端解压）
    const handleZipChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !patientId) return;

        try {
            const result = await uploadZipApi(patientId, files[0]);
            queryClient.invalidateQueries({ queryKey: ['imagingFiles', patientId] });
            const msg = `上传完成，共 ${result.created} 个文件` + (result.skipped > 0 ? `，跳过 ${result.skipped} 个不支持的文件` : '');
            toast.success(msg);
        } catch (error) {
            const err = error as { message?: string };
            toast.error(`上传失败：${err.message || '请稍后重试'}`);
        }

        if (zipInputRef.current) zipInputRef.current.value = '';
    };



    const [deleteTarget, setDeleteTarget] = useState<{ id: string; isSeries: boolean; count: number } | null>(null);

    const handleDelete = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const seriesFiles = seriesFilesMap.get(id);
        if (seriesFiles && seriesFiles.length > 0) {
            setDeleteTarget({ id, isSeries: true, count: seriesFiles.length });
        } else {
            setDeleteTarget({ id, isSeries: false, count: 1 });
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        const { id, isSeries } = deleteTarget;
        try {
            if (isSeries) {
                const seriesFiles = seriesFilesMap.get(id);
                if (seriesFiles) {
                    for (const file of seriesFiles) {
                        await deleteMutation.mutateAsync(file.id);
                    }
                }
            } else {
                await deleteMutation.mutateAsync(id);
            }
            if (selectedImage?.id === id) setSelectedImage(null);
            toast.success('删除成功');
        } catch (error) {
            console.error('删除失败', error);
            toast.error(`删除失败: ${error}`);
        }
        setDeleteTarget(null);
    };



    // Helper to generate image stack

    const getViewportImageIds = (image: GalleryImage): string[] => {

        if (image.type === 'image') return [image.url];

        

        // 检查是否是 series

        const seriesFiles = seriesFilesMap.get(image.id);

        if (seriesFiles && seriesFiles.length > 1) {

            // 返回 series 中所有文件的 URL

            return seriesFiles.map(f => `wadouri:${f.file_url}`);

        }

        

        // 单个 DICOM 文件

        return [`wadouri:${image.url}`];

    };



    // Resize logic

    const [viewerDimensions, setViewerDimensions] = useState<{ width: number | string, height: number | string } | null>(null);

    const isResizing = React.useRef(false);



    const handleResizeStart = (e: React.MouseEvent) => {

        e.preventDefault();

        isResizing.current = true;

        document.addEventListener('mousemove', handleResizeMove);

        document.addEventListener('mouseup', handleResizeEnd);

    };



    const handleResizeMove = (e: MouseEvent) => {

        if (!isResizing.current) return;

        

        // Calculate new dimensions based on distance from center (since dialog is centered)

        // We want the right-bottom corner to follow the mouse

        // Distance from center X = clientX - window.innerWidth/2

        // New Width = 2 * (clientX - window.innerWidth/2)

        

        const centerX = window.innerWidth / 2;

        const centerY = window.innerHeight / 2;

        

        const deltaX = Math.max(100, e.clientX - centerX); // Don't allow flipping

        const deltaY = Math.max(100, e.clientY - centerY);

        

        setViewerDimensions({

            width: deltaX * 2,

            height: deltaY * 2

        });

    };



    const handleResizeEnd = () => {

        isResizing.current = false;

        document.removeEventListener('mousemove', handleResizeMove);

        document.removeEventListener('mouseup', handleResizeEnd);

    };



    if (!patientId) {

        return (

            <Card className="w-1/4 flex flex-col min-h-0 bg-slate-50/50">

                <CardHeader className="pb-2">

                    <CardTitle className="text-base">影像资料库</CardTitle>

                </CardHeader>

                <div className="h-[1px] bg-slate-200" />

                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">

                    请先选择患者

                </div>

            </Card>

        );

    }



    return (
        <>
        <Card className="w-1/4 flex flex-col min-h-0 bg-slate-50/50">

            <CardHeader className="pb-2">

                <div className="flex items-center justify-between">

                    <CardTitle className="text-base">影像资料库</CardTitle>

                    <div className="flex gap-1">
                        <input type="file" ref={fileInputRef} className="hidden" accept=".dcm,.jpg,.png,.jpeg" multiple onChange={handleFileChange} />
                        {/* @ts-expect-error webkitdirectory 是非标准属性，作为 showDirectoryPicker 的 fallback */}
                        <input type="file" ref={folderInputRef} className="hidden" webkitdirectory="" directory="" multiple onChange={handleFolderFallback} />
                        <input type="file" ref={zipInputRef} className="hidden" accept=".zip" onChange={handleZipChange} />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={uploadMutation.isPending} title="上传">
                                    {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                                    <FileImage className="mr-2 h-4 w-4" />
                                    上传文件
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={(e) => {
                                    e.preventDefault();
                                    handleFolderUpload();
                                }}>
                                    <FolderOpen className="mr-2 h-4 w-4" />
                                    上传文件夹
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => zipInputRef.current?.click()}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    上传压缩包
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                </div>

            </CardHeader>

            <div className="h-[1px] bg-slate-200" />

            <div className="flex-1 overflow-hidden">

            <ScrollArea className="h-full p-4">

                {isLoading ? (

                    <div className="flex items-center justify-center py-8">

                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />

                    </div>

                ) : (

                <div className="grid grid-cols-2 gap-3">

                    {images.map(img => (

                        <div 

                            key={img.id} 

                            className="group relative aspect-square bg-white rounded-lg border shadow-sm cursor-pointer hover:border-blue-400 transition-all overflow-hidden"

                            onClick={() => {

                                setSelectedImage(img);

                                setViewerDimensions(null); // Reset size on open

                            }}

                        >

                            {/* Preview Thumbnail */}

                            <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">

                                {img.type === 'image' ? (

                                    <img src={img.url} alt={img.name} className="w-full h-full object-cover" />

                                ) : (

                                    <div className="flex flex-col items-center gap-1">
                                        <div className="relative w-10 h-10">
                                            {/* 堆叠卡片效果 */}
                                            <div className="absolute inset-0 translate-x-1 -translate-y-1 rounded bg-slate-200/80 border border-slate-300" />
                                            <div className="absolute inset-0 translate-x-0.5 -translate-y-0.5 rounded bg-slate-100 border border-slate-300" />
                                            <div className="relative w-full h-full rounded bg-white border border-slate-300 flex items-center justify-center">
                                                <FileImage className="h-5 w-5 text-blue-500" />
                                            </div>
                                            {(img.count || 0) > 1 && (
                                                <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-[9px] min-w-[18px] h-[18px] flex items-center justify-center px-1 rounded-full font-medium shadow-sm">
                                                    {img.count}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[10px] font-medium text-slate-500">DICOM</span>
                                    </div>

                                )}

                            </div>



                            {/* Overlay Info */}

                            <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 text-white text-[10px] truncate px-2">

                                {img.name}

                            </div>



                            {/* Delete Action (visible on hover) */}

                            <button

                                type="button"

                                className="absolute top-1 right-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 rounded-full p-1 hover:text-red-500 hover:bg-white cursor-pointer"

                                onClick={(e) => handleDelete(img.id, e)}

                                aria-label="删除"

                            >

                                <Trash2 className="h-3 w-3 pointer-events-none" />

                            </button>

                        </div>

                    ))}

                    

                    {images.length === 0 && (

                        <div className="col-span-2 py-8 text-center text-xs text-muted-foreground flex flex-col items-center border-2 border-dashed rounded-lg">

                            <Upload className="h-8 w-8 mb-2 opacity-50" />

                            <span>暂无影像</span>

                            <span className="scale-90 opacity-70">点击上方按钮上传</span>

                        </div>

                    )}

                </div>

                )}

            </ScrollArea>

            </div>



            {/* Preview Dialog - JS Resizable */}

            <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>

                <DialogContent 

                    showCloseButton={false} 

                    className="flex flex-col p-0 overflow-hidden bg-white/95 backdrop-blur-sm border-none shadow-2xl transition-none"

                    style={{ 

                        width: viewerDimensions?.width || '80vh', 

                        height: viewerDimensions?.height || '80vh',

                        maxWidth: '100vw',

                        maxHeight: '100vh',

                        aspectRatio: viewerDimensions ? 'auto' : '1/1'

                    }}

                >

                    <DialogHeader className="absolute top-0 left-0 right-0 z-50 p-4 py-2 bg-transparent pointer-events-none">

                        <DialogTitle className="flex items-center justify-between text-sm text-white drop-shadow-md">

                            <span className="truncate max-w-[300px] font-medium opacity-80">{selectedImage?.name}</span>

                        </DialogTitle>

                        <div className="hidden">

                            <DialogDescription>

                                Preview of {selectedImage?.name}

                            </DialogDescription>

                        </div>

                    </DialogHeader>

                    

                    {selectedImage?.type === 'dicom-series' && (

                         <div className="absolute top-12 right-4 z-[60] flex flex-col items-end gap-1 pointer-events-none opacity-60 text-[12px] text-white font-sans drop-shadow-md">

                             <div className="bg-black/40 backdrop-blur-md px-2 py-1 rounded-md flex flex-col gap-1 items-end">

                                <span>左键拖拽：上下翻页</span>

                                <span>右键拖拽：图像缩放</span>

                                <span>Ctrl + 左键：调整亮度</span>

                                <span>中键拖拽：平移图像</span>

                                <span className="text-white/50 pt-1 mt-1">支持拖动右下角调整窗口大小</span>

                             </div>

                         </div>

                    )}

                    

                    <div className="flex-1 bg-black relative min-h-0 w-full h-full">

                        {selectedImage?.type === 'dicom-series' ? (

                            <DicomViewport 

                                imageIds={getViewportImageIds(selectedImage)}

                                initialImageId={getViewportImageIds(selectedImage)[0]}

                                className="w-full h-full"

                            />

                        ) : (

                            // Simple view for standard images

                             <div className="w-full h-full flex items-center justify-center">

                                <img src={selectedImage?.url} alt="preview" className="max-w-full max-h-full object-contain" />

                            </div>

                        )}

                    </div>



                    {/* Custom Resize Handle */}

                    <div 

                        className="absolute bottom-0 right-0 w-6 h-6 z-[70] cursor-nwse-resize flex items-end justify-end p-1 hover:bg-white/20 rounded-tl-lg transition-colors group"

                        onMouseDown={handleResizeStart}

                    >

                         <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-50 group-hover:opacity-100">

                             <path d="M8 0V8H0L8 0Z" fill="white"/>

                         </svg>

                    </div>

                </DialogContent>

            </Dialog>

        </Card>

        <ConfirmDialog
            open={deleteTarget !== null}
            onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            title="删除影像"
            description={deleteTarget?.isSeries
                ? `确定要删除这个系列吗？（共 ${deleteTarget.count} 张影像）`
                : '确定要删除这张影像吗？'}
            confirmText="删除"
            variant="destructive"
            onConfirm={confirmDelete}
        />
        </>
    );

}

