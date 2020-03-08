import { Scope } from '../scope/';
import Workspace from './workspace';
import { ComponentFactory } from '../component';
import { loadConsumerIfExist } from '../../consumer';
import { Isolator } from '../isolator';
import { WorkspaceConfig } from '../workspace-config';
import { Harmony } from '../../harmony';
import ComponentConfig from '../../consumer/config/component-config';
import { ExtensionConfigList } from '../workspace-config/extension-config-list';

export type WorkspaceDeps = [WorkspaceConfig, Scope, ComponentFactory, Isolator];

export type WorkspaceCoreConfig = {
  /**
   * sets the default location of components.
   */
  componentsDefaultDirectory: string;

  /**
   * default scope for components to be exported to. absolute require paths for components
   * will be generated accordingly.
   */
  defaultScope: string;
};

export default async function provideWorkspace(
  config: WorkspaceCoreConfig,
  [workspaceConfig, scope, component, isolateEnv]: WorkspaceDeps,
  harmony: Harmony<unknown>
) {
  // don't use loadConsumer() here because the consumer might not be available.
  // also, this loadConsumerIfExist() is wrapped with try/catch in order not to break when the
  // consumer can't be loaded due to .bitmap or bit.json issues which are fixed on a later phase
  // open bit init --reset.
  // keep in mind that here is the first place where the consumer is loaded.
  // an unresolved issue here is when running tasks, such as "bit run build" outside of a consumer.
  // we'll have to fix this asap.
  try {
    const consumer = await loadConsumerIfExist();
    if (consumer) {
      const workspace = new Workspace(consumer, workspaceConfig, scope, component, isolateEnv, undefined, harmony);
      ComponentConfig.registerOnComponentConfigLoading('component-service', componentConfig => {
        const extensionsConfig = ExtensionConfigList.fromObject(componentConfig.extensions);
        workspace.loadExtensionsByConfig(extensionsConfig);
      });
      await workspace.loadWorkspaceExtensions();
      return workspace;
    }

    return undefined;
  } catch {
    return undefined;
  }
}
