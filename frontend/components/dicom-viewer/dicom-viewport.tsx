"use client"

import React, { useEffect, useRef, useState } from 'react';
import {
  RenderingEngine,
  Enums,
  type Types,
} from '@cornerstonejs/core';
import {
  addTool,
  ToolGroupManager,
  WindowLevelTool,
  PanTool,
  ZoomTool,
  StackScrollTool,
  Enums as csToolsEnums,
} from '@cornerstonejs/tools';
import { initCornerstone } from '@/lib/cornerstone-init';
import { Loader2 } from 'lucide-react';

interface DicomViewportProps {
  imageIds: string[]; // Array of 'wadouri:...' urls
  initialImageId?: string; // Optional: Access specific image in stack
  className?: string;
}

const viewportId = 'DICOM_VIEWPORT_ID';
// Remove module-level constants to avoid ID collisions
// const renderingEngineId = 'MY_RENDERING_ENGINE_ID';
// const toolGroupId = 'MY_TOOLGROUP_ID';

export function DicomViewport({ imageIds, initialImageId, className }: DicomViewportProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const renderingEngineRef = useRef<RenderingEngine | null>(null);
  const toolGroupRef = useRef<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate unique IDs for this instance to prevent collisions
  const renderingEngineId = useRef(`engine-${Math.random().toString(36).slice(2, 9)}`).current;
  const toolGroupId = useRef(`group-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    let isMounted = true;
    const setup = async () => {
        if (!elementRef.current || imageIds.length === 0) return;
        
        setIsLoading(true);
        setError(null);

        try {
            await initCornerstone();

            if (!isMounted) return;

            // 1. Add tools to Cornerstone internally
            // This is global, duplicates are ignored or can be caught
            try {
                addTool(WindowLevelTool);
                addTool(PanTool);
                addTool(ZoomTool);
                addTool(StackScrollTool);
            } catch (error) {
                // Tools might already be added
            }

            // 2. Create Rendering Engine
            const renderingEngine = new RenderingEngine(renderingEngineId);
            renderingEngineRef.current = renderingEngine;

            // 3. Create or Get ToolGroup
            let toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
            if (!toolGroup) {
              toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
            }
            
            if (toolGroup) {
                // Add tools safely
                const safeAdd = (toolName: string) => {
                    if (!toolGroup?.hasTool(toolName)) {
                        toolGroup?.addTool(toolName);
                    }
                };

                safeAdd(WindowLevelTool.toolName);
                safeAdd(PanTool.toolName);
                safeAdd(ZoomTool.toolName);
                safeAdd(StackScrollTool.toolName);

                // Set Tool States
                // 1. Stack Scroll (Left Click / Wheel)
                toolGroup.setToolActive(StackScrollTool.toolName, {
                    bindings: [
                        { mouseButton: csToolsEnums.MouseBindings.Primary }, // Left Drag
                        { mouseButton: csToolsEnums.MouseBindings.Wheel },
                    ],
                });

                // 2. Zoom (Right Click) - Requested "Image can also be zoomed"
                toolGroup.setToolActive(ZoomTool.toolName, {
                    bindings: [
                        { mouseButton: csToolsEnums.MouseBindings.Secondary }, 
                    ],
                });

                // 3. Pan (Middle Click)
                toolGroup.setToolActive(PanTool.toolName, {
                    bindings: [
                        { mouseButton: csToolsEnums.MouseBindings.Auxiliary }, 
                    ],
                });
                
                // 4. WindowLevel (Brightness) - Moved to Ctrl + Left Click
                toolGroup.setToolActive(WindowLevelTool.toolName, {
                    bindings: [
                        { 
                            mouseButton: csToolsEnums.MouseBindings.Primary,
                            modifierKey: csToolsEnums.KeyboardBindings.Ctrl,
                        }, 
                    ],
                });
                
                toolGroupRef.current = toolGroup;
            }

            // 4. Register Viewport
            const viewportInput = {
                viewportId,
                type: Enums.ViewportType.STACK,
                element: elementRef.current,
                defaultOptions: {
                    background: [0, 0, 0] as Types.Point3,
                },
            };

            renderingEngine.enableElement(viewportInput);

            // 5. Add Viewport to ToolGroup
            if (toolGroup) {
                toolGroup.addViewport(viewportId, renderingEngineId);
            }

            // 6. Get Viewport and Load Stack
            const viewport = renderingEngine.getViewport(viewportId) as Types.IStackViewport;
            
            // Handle stack and initial index
            let initialIndex = 0;
            if (initialImageId) {
                const index = imageIds.indexOf(initialImageId);
                if (index !== -1) initialIndex = index;
            }

            await viewport.setStack(imageIds, initialIndex);
            
            viewport.render();
        } catch (e: any) {
            console.error("Cornerstone Error:", e);
            if (isMounted) setError(e.message || "Failed to load DICOM image");
        } finally {
            if (isMounted) setIsLoading(false);
        }
    };

    setup();

    return () => {
        isMounted = false;
        // Cleanup resources to prevent WebGL context leaks
        if (renderingEngineRef.current) {
            try {
                renderingEngineRef.current.destroy();
            } catch (e) {
                console.warn("Error destroying rendering engine:", e);
            }
            renderingEngineRef.current = null;
        }
        
        if (toolGroupId) {
            try {
                ToolGroupManager.destroyToolGroup(toolGroupId);
            } catch (e) {
                console.warn("Error destroying tool group:", e);
            }
        }
    };
  }, [imageIds, initialImageId, renderingEngineId, toolGroupId]);

  return (
    <div className={`relative bg-black w-full h-full overflow-hidden ${className}`}>
        <div 
            ref={elementRef} 
            className="w-full h-full text-white"
            onContextMenu={(e) => e.preventDefault()}
        />
        
        {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white z-10 pointer-events-none">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading DICOM...</span>
            </div>
        )}
        
        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-500 p-4 text-center z-10">
                 Error: {error}
            </div>
        )}
    </div>
  );
}
