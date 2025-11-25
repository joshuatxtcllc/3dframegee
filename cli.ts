#!/usr/bin/env node

import dotenv from 'dotenv';
import { db } from './config/database';
import { ModelGenerator } from './generators/ModelGenerator';
import { addGenerationJob, addBatchGenerationJob, closeQueue } from './queue/queue';
import { logger } from './utils/logger';

dotenv.config();

const modelGenerator = new ModelGenerator();

interface CLIOptions {
  command: string;
  frameId?: string;
  frameIds?: string[];
  all?: boolean;
  force?: boolean;
}

async function parseArgs(): Promise<CLIOptions> {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const command = args[0];
  const options: CLIOptions = { command };

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--frame' || arg === '-f') {
      options.frameId = args[++i];
    } else if (arg === '--frames') {
      options.frameIds = args[++i].split(',');
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg === '--force') {
      options.force = true;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
FrameForge 3D CLI - Automated 3D Frame Model Generator for Jay's Frames

Usage: npm run generate -- <command> [options]

Commands:
  generate         Generate 3D models for one or more frames
  queue            Add generation jobs to the queue (requires worker running)
  list             List frames and their model status
  stats            Show generation statistics

Options:
  --frame, -f <id>      Generate model for a single frame ID
  --frames <ids>        Generate models for comma-separated frame IDs
  --all                 Generate models for all frames missing them
  --force               Force regeneration even if models exist

Examples:
  # Generate model for a single frame immediately
  npm run generate -- generate --frame abc123

  # Generate models for multiple frames immediately
  npm run generate -- generate --frames abc123,def456,ghi789

  # Generate models for all frames missing them
  npm run generate -- generate --all

  # Add a generation job to the queue
  npm run generate -- queue --frame abc123

  # Add batch job to queue with force regeneration
  npm run generate -- queue --all --force

  # List all frames and their model status
  npm run generate -- list

  # Show statistics
  npm run generate -- stats
`);
}

async function generateCommand(options: CLIOptions) {
  try {
    if (options.frameId) {
      // Generate single frame
      logger.info(`Generating model for frame ${options.frameId}...`);
      const frame = await db.getFrame(options.frameId);
      
      if (!frame) {
        logger.error(`Frame not found: ${options.frameId}`);
        process.exit(1);
      }

      const result = await modelGenerator.generateModels(frame);
      
      await db.updateFrameModels(
        options.frameId,
        result.glb_url,
        result.usdz_url,
        result.file_size
      );

      logger.info(`✅ Model generated successfully!`);
      logger.info(`   GLB: ${result.glb_url}`);
      logger.info(`   USDZ: ${result.usdz_url}`);
      logger.info(`   Size: ${(result.file_size / 1024 / 1024).toFixed(2)}MB`);
      logger.info(`   Time: ${result.generation_time_ms}ms`);
    } else if (options.frameIds) {
      // Generate multiple frames
      logger.info(`Generating models for ${options.frameIds.length} frames...`);
      
      for (const frameId of options.frameIds) {
        try {
          const frame = await db.getFrame(frameId);
          if (!frame) {
            logger.warn(`Frame not found: ${frameId}, skipping`);
            continue;
          }

          const result = await modelGenerator.generateModels(frame);
          await db.updateFrameModels(frameId, result.glb_url, result.usdz_url, result.file_size);
          
          logger.info(`✅ ${frameId}: Generated (${(result.file_size / 1024 / 1024).toFixed(2)}MB)`);
        } catch (error) {
          logger.error(`❌ ${frameId}: Failed - ${error}`);
        }
      }
    } else if (options.all) {
      // Generate all missing
      const framesWithoutModels = await db.getFramesWithoutModels();
      logger.info(`Found ${framesWithoutModels.length} frames without models`);
      
      for (const frame of framesWithoutModels) {
        try {
          const result = await modelGenerator.generateModels(frame);
          await db.updateFrameModels(frame.id, result.glb_url, result.usdz_url, result.file_size);
          
          logger.info(`✅ ${frame.sku || frame.id}: ${frame.name} (${(result.file_size / 1024 / 1024).toFixed(2)}MB)`);
        } catch (error) {
          logger.error(`❌ ${frame.sku || frame.id}: Failed - ${error}`);
        }
      }
    } else {
      logger.error('Please specify --frame, --frames, or --all');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Generation failed:', error);
    process.exit(1);
  }
}

async function queueCommand(options: CLIOptions) {
  try {
    if (options.frameId) {
      const job = await addGenerationJob(options.frameId, { forceRegenerate: options.force });
      logger.info(`✅ Job added to queue: ${job.id}`);
    } else if (options.frameIds) {
      const jobs = await addBatchGenerationJob(options.frameIds, { forceRegenerate: options.force });
      logger.info(`✅ Batch jobs added to queue: ${jobs.length} jobs for ${options.frameIds.length} frames`);
    } else if (options.all) {
      const framesWithoutModels = await db.getFramesWithoutModels();
      const frameIds = framesWithoutModels.map((f) => f.id);
      const jobs = await addBatchGenerationJob(frameIds, { forceRegenerate: options.force });
      logger.info(`✅ Batch jobs added to queue: ${jobs.length} jobs for ${frameIds.length} frames`);
    } else {
      logger.error('Please specify --frame, --frames, or --all');
      process.exit(1);
    }
    
    await closeQueue();
  } catch (error) {
    logger.error('Queue command failed:', error);
    process.exit(1);
  }
}

async function listCommand() {
  try {
    const frames = await db.getFrames(100);
    
    console.log('\n📦 Frames and Model Status:\n');
    console.log('SKU'.padEnd(15), 'Name'.padEnd(30), 'AR Enabled', 'Models');
    console.log('-'.repeat(80));
    
    for (const frame of frames) {
      const sku = (frame.sku || frame.id).padEnd(15);
      const name = frame.name.substring(0, 28).padEnd(30);
      const arEnabled = frame.ar_enabled ? '✅' : '❌';
      const hasModels = frame.model_glb_url && frame.model_usdz_url ? '✅ GLB+USDZ' : '❌ Missing';
      
      console.log(sku, name, arEnabled.padEnd(10), hasModels);
    }
    
    console.log();
  } catch (error) {
    logger.error('List command failed:', error);
    process.exit(1);
  }
}

async function statsCommand() {
  try {
    const allFrames = await db.getFrames(10000); // Get all frames
    const framesWithoutModels = await db.getFramesWithoutModels();
    
    const withModels = allFrames.filter((f) => f.model_glb_url && f.model_usdz_url).length;
    const withoutModels = framesWithoutModels.length;
    const arEnabled = allFrames.filter((f) => f.ar_enabled).length;
    
    console.log('\n📊 Generation Statistics:\n');
    console.log(`Total Frames:        ${allFrames.length}`);
    console.log(`With 3D Models:      ${withModels} (${((withModels / allFrames.length) * 100).toFixed(1)}%)`);
    console.log(`Missing Models:      ${withoutModels} (${((withoutModels / allFrames.length) * 100).toFixed(1)}%)`);
    console.log(`AR Enabled:          ${arEnabled} (${((arEnabled / allFrames.length) * 100).toFixed(1)}%)`);
    console.log();
  } catch (error) {
    logger.error('Stats command failed:', error);
    process.exit(1);
  }
}

// Main
async function main() {
  try {
    const options = await parseArgs();
    
    switch (options.command) {
      case 'generate':
        await generateCommand(options);
        break;
      case 'queue':
        await queueCommand(options);
        break;
      case 'list':
        await listCommand();
        break;
      case 'stats':
        await statsCommand();
        break;
      default:
        logger.error(`Unknown command: ${options.command}`);
        printHelp();
        process.exit(1);
    }
    
    await db.close();
    process.exit(0);
  } catch (error) {
    logger.error('CLI error:', error);
    process.exit(1);
  }
}

main();
