/**
 * FrameForge 3D Integration Examples
 * 
 * These examples show how to integrate the 3D model generation
 * system into your existing Jay's Frames website and FrameKraft application.
 */

// ============================================================================
// EXAMPLE 1: React Component for Product Page with AR
// ============================================================================

import React, { useEffect, useState } from 'react';

interface FrameModel {
  glb: string;
  usdz: string;
}

interface Frame {
  id: string;
  sku: string;
  name: string;
  price: number;
  arEnabled: boolean;
  models: FrameModel;
}

export const FrameARViewer: React.FC<{ frameId: string }> = ({ frameId }) => {
  const [frame, setFrame] = useState<Frame | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFrameModels = async () => {
      try {
        const response = await fetch(`${process.env.FRAMEFORGE_API}/api/frame/${frameId}/models`);
        if (!response.ok) throw new Error('Failed to load frame models');
        const data = await response.json();
        setFrame(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchFrameModels();
  }, [frameId]);

  if (loading) return <div className="ar-viewer-loading">Loading AR preview...</div>;
  if (error) return <div className="ar-viewer-error">{error}</div>;
  if (!frame?.arEnabled) return null;

  return (
    <div className="frame-ar-viewer">
      <model-viewer
        src={frame.models.glb}
        ios-src={frame.models.usdz}
        alt={`${frame.name} - Houston Heights Custom Framing`}
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        environment-image="neutral"
        shadow-intensity="1"
        auto-rotate
        style={{ width: '100%', height: '500px' }}
      >
        <button slot="ar-button" className="ar-button">
          <span className="ar-icon">👋</span>
          View in Your Space
        </button>
        
        <div className="ar-prompt">
          <p>See how this frame looks on your wall using AR</p>
        </div>
      </model-viewer>

      <style jsx>{`
        .frame-ar-viewer {
          margin: 2rem 0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .ar-button {
          background: #2563eb;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .ar-button:hover {
          background: #1d4ed8;
          transform: translateY(-2px);
        }

        .ar-prompt {
          position: absolute;
          bottom: 20px;
          left: 20px;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// EXAMPLE 2: Batch Generate Models for New Inventory
// ============================================================================

/**
 * Call this when adding new frames to FrameKraft inventory
 */
async function generateModelsForNewFrames(frameIds: string[]): Promise<void> {
  const FRAMEFORGE_API = process.env.FRAMEFORGE_API || 'http://localhost:3000';
  
  try {
    const response = await fetch(`${FRAMEFORGE_API}/api/batch-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frameIds,
        forceRegenerate: false,
      }),
    });

    if (!response.ok) throw new Error('Failed to start batch generation');

    const { jobId } = await response.json();
    
    console.log(`✅ Batch generation started: Job ${jobId}`);
    
    // Poll for completion
    await pollJobStatus(jobId);
  } catch (error) {
    console.error('❌ Failed to generate models:', error);
  }
}

async function pollJobStatus(jobId: string): Promise<void> {
  const FRAMEFORGE_API = process.env.FRAMEFORGE_API || 'http://localhost:3000';
  const maxAttempts = 60; // 5 minutes with 5s intervals
  
  for (let i = 0; i < maxAttempts; i++) {
    const response = await fetch(`${FRAMEFORGE_API}/api/job-status/${jobId}`);
    const status = await response.json();
    
    if (status.state === 'completed') {
      console.log('✅ Models generated successfully');
      return;
    }
    
    if (status.state === 'failed') {
      throw new Error(`Generation failed: ${status.failedReason}`);
    }
    
    console.log(`⏳ Progress: ${status.progress}%`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  throw new Error('Job timeout');
}

// ============================================================================
// EXAMPLE 3: SEO Schema Generator
// ============================================================================

interface SchemaGeneratorOptions {
  frame: Frame;
  businessInfo: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone: string;
  };
}

export function generateProductSchema(options: SchemaGeneratorOptions): string {
  const { frame, businessInfo } = options;
  
  const schema = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": `${frame.name} - ${businessInfo.city} Custom Framing`,
    "description": `Museum-quality ${frame.name.toLowerCase()} handcrafted at Jay's Frames in ${businessInfo.city}`,
    "image": `https://jaysframes.com/images/frames/${frame.sku}.jpg`,
    "model": {
      "@type": "3DModel",
      "encodingFormat": "model/gltf-binary",
      "contentUrl": frame.models.glb
    },
    "offers": {
      "@type": "Offer",
      "availability": "https://schema.org/InStock",
      "price": frame.price.toFixed(2),
      "priceCurrency": "USD",
      "url": `https://jaysframes.com/frames/${frame.sku}`,
      "seller": {
        "@type": "LocalBusiness",
        "name": businessInfo.name,
        "address": {
          "@type": "PostalAddress",
          "streetAddress": businessInfo.address,
          "addressLocality": businessInfo.city,
          "addressRegion": businessInfo.state,
          "postalCode": businessInfo.zip,
          "addressCountry": "US"
        },
        "telephone": businessInfo.phone,
        "priceRange": "$$",
        "image": "https://jaysframes.com/logo.png",
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": "29.7929",
          "longitude": "-95.4032"
        },
        "openingHoursSpecification": [
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "opens": "10:00",
            "closes": "18:00"
          },
          {
            "@type": "OpeningHoursSpecification",
            "dayOfWeek": "Saturday",
            "opens": "10:00",
            "closes": "16:00"
          }
        ]
      }
    }
  };
  
  return JSON.stringify(schema, null, 2);
}

// ============================================================================
// EXAMPLE 4: WordPress Shortcode Integration
// ============================================================================

/**
 * Add this to your WordPress theme's functions.php
 */
/*
function jaysframes_ar_viewer_shortcode($atts) {
    $atts = shortcode_atts(array(
        'frame_id' => '',
        'sku' => '',
    ), $atts);
    
    if (empty($atts['frame_id'])) {
        return '<p>Frame ID required</p>';
    }
    
    $api_url = get_option('frameforge_api_url', 'https://frameforge.jaysframes.com');
    $frame_data = wp_remote_get("{$api_url}/api/frame/{$atts['frame_id']}/models");
    
    if (is_wp_error($frame_data)) {
        return '<p>Failed to load AR viewer</p>';
    }
    
    $frame = json_decode(wp_remote_retrieve_body($frame_data), true);
    
    if (!$frame['arEnabled']) {
        return '';
    }
    
    return sprintf(
        '<script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
        <model-viewer
            src="%s"
            ios-src="%s"
            alt="%s"
            ar
            ar-modes="webxr scene-viewer quick-look"
            camera-controls
            environment-image="neutral"
            shadow-intensity="1"
            auto-rotate
            style="width: 100%%; height: 500px;">
            <button slot="ar-button" class="ar-button">
                👋 View in Your Space
            </button>
        </model-viewer>',
        esc_url($frame['models']['glb']),
        esc_url($frame['models']['usdz']),
        esc_attr($frame['name'])
    );
}
add_shortcode('jaysframes_ar', 'jaysframes_ar_viewer_shortcode');

// Usage in WordPress posts/pages:
// [jaysframes_ar frame_id="abc123"]
*/

// ============================================================================
// EXAMPLE 5: Webhook Handler for Automatic Generation
// ============================================================================

/**
 * Add this webhook to FrameKraft to auto-generate models when frames are added
 */
import express from 'express';

const webhookRouter = express.Router();

webhookRouter.post('/framekraft/frame-created', async (req, res) => {
  const { frameId, sku, name } = req.body;
  
  try {
    // Verify webhook signature (implement your auth)
    // const isValid = verifyWebhookSignature(req);
    // if (!isValid) return res.status(401).json({ error: 'Unauthorized' });
    
    console.log(`📦 New frame created: ${sku} - ${name}`);
    
    // Auto-generate 3D model
    const response = await fetch(`${process.env.FRAMEFORGE_API}/api/generate-model`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frameId }),
    });
    
    if (!response.ok) throw new Error('Failed to queue generation');
    
    const { jobId } = await response.json();
    
    console.log(`✅ 3D model generation queued: Job ${jobId}`);
    
    res.json({ success: true, jobId });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default webhookRouter;

// ============================================================================
// EXAMPLE 6: Admin Dashboard Component
// ============================================================================

export const ARModelsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const fetchMetrics = async () => {
    const response = await fetch(`${process.env.FRAMEFORGE_API}/api/queue/metrics`);
    setMetrics(await response.json());
  };

  const generateAllMissing = async () => {
    setGenerating(true);
    try {
      await fetch(`${process.env.FRAMEFORGE_API}/api/generate-all-missing`, {
        method: 'POST',
      });
      alert('Batch generation started!');
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="ar-dashboard">
      <h2>3D Model Generation Status</h2>
      
      {metrics && (
        <div className="metrics">
          <div className="metric">
            <span className="label">Waiting:</span>
            <span className="value">{metrics.waiting}</span>
          </div>
          <div className="metric">
            <span className="label">Active:</span>
            <span className="value">{metrics.active}</span>
          </div>
          <div className="metric">
            <span className="label">Completed:</span>
            <span className="value">{metrics.completed}</span>
          </div>
          <div className="metric">
            <span className="label">Failed:</span>
            <span className="value">{metrics.failed}</span>
          </div>
        </div>
      )}
      
      <button 
        onClick={generateAllMissing}
        disabled={generating}
        className="generate-button"
      >
        {generating ? 'Generating...' : 'Generate All Missing Models'}
      </button>
    </div>
  );
};
