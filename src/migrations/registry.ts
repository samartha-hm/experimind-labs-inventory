import { FabLabLoans1793232000033 } from "../migration/1793232000033-FabLabLoans.ts";
import type { MigrationInterface } from 'typeorm';
import { migrationManifest } from './manifest.mjs';
import { Init1689500000000 } from '../migration/1689500000000-Init.ts';
import { AddOrgAuditOrdersInvoices1689500000001 } from '../migration/1689500000001-AddOrgAuditOrdersInvoices.ts';
import { SeedDefaultOrganization1689500000002 } from '../migration/1689500000002-SeedDefaultOrganization.ts';
import { AlignEntitiesAndSchema1689500000003 } from '../migration/1689500000003-AlignEntitiesAndSchema.ts';
import { CleanSchemaAlignment1689500000004 } from '../migration/1689500000004-CleanSchemaAlignment.ts';
import { FinalSchemaReconciliation1689500000005 } from '../migration/1689500000005-FinalSchemaReconciliation.ts';
import { SeedAdminUser1689500000006 } from '../migration/1689500000006-SeedAdminUser.ts';
import { AddVisualWarehouseAndSerialNumbers1689500000007 } from '../migration/1689500000007-AddVisualWarehouseAndSerialNumbers.ts';
import { ProductionReconciliation1689500000007 } from '../migration/1689500000007-ProductionReconciliation.ts';
import { AddStockLedgerAndWmsOps1689500000008 } from '../migration/1689500000008-AddStockLedgerAndWmsOps.ts';
import { AddRbacAndSessions1689500000009 } from '../migration/1689500000009-AddRbacAndSessions.ts';
import { EnterpriseMultiLocationAndAuditCore1689500000010 } from '../migration/1689500000010-EnterpriseMultiLocationAndAuditCore.ts';
import { AddQmsAndESignatures1689500000011 } from '../migration/1689500000011-AddQmsAndESignatures.ts';
import { AddOrderFulfillmentFields1689500000012 } from '../migration/1689500000012-AddOrderFulfillmentFields.ts';
import { AddHardwareElectronicsBOM1689500000013 } from '../migration/1689500000013-AddHardwareElectronicsBOM.ts';
import { AddStockIntegrityAndSpatialTree1689500000014 } from '../migration/1689500000014-AddStockIntegrityAndSpatialTree.ts';
import { AddReservedQuantity1689500000015 } from '../migration/1689500000015-AddReservedQuantity.ts';
import { AddProductTemplates1791417600000 } from '../migration/1791417600000-AddProductTemplates.ts';
import { AddKitSubjectsAndGrades1791417600001 } from '../migration/1791417600001-AddKitSubjectsAndGrades.ts';
import { AddProjectPlanning1791417600002 } from '../migration/1791417600002-AddProjectPlanning.ts';
import { AddPhysicalStocktake1791504000003 } from '../migration/1791504000003-AddPhysicalStocktake.ts';
import { AddReservationsAndProcurement1791676800004 } from '../migration/1791676800004-AddReservationsAndProcurement.ts';
import { AddProductionPlanning1791763200005 } from '../migration/1791763200005-AddProductionPlanning.ts';
import { HardenProductionReconciliation1791763200006 } from '../migration/1791763200006-HardenProductionReconciliation.ts';
import { AddPacking1791849600007 } from '../migration/1791849600007-AddPacking.ts';
import { HardenPackingReadiness1791936000008 } from '../migration/1791936000008-HardenPackingReadiness.ts';
import { AddDeliveryCustody1792022400009 } from '../migration/1792022400009-AddDeliveryCustody.ts';
import { AddProjectCompletion1792108800010 } from '../migration/1792108800010-AddProjectCompletion.ts';
import { AddPrivateAttachments1792195200011 } from '../migration/1792195200011-AddPrivateAttachments.ts';
import { AddSharedLabelLayouts1792281600012 } from '../migration/1792281600012-AddSharedLabelLayouts.ts';
import { AddRequirementApproval1792368000013 } from '../migration/1792368000013-AddRequirementApproval.ts';
import { HardenApprovedPackingDemand1792454400014 } from '../migration/1792454400014-HardenApprovedPackingDemand.ts';
import { AddCommitmentLedger1792540800015 } from '../migration/1792540800015-AddCommitmentLedger.ts';
import { HardenCommitmentEventEvidence1792540800016 } from '../migration/1792540800016-HardenCommitmentEventEvidence.ts';
import { AddLedgerCapabilities1792540800017 } from '../migration/1792540800017-AddLedgerCapabilities.ts';
import { AddReservationCommitments1792540800018 } from '../migration/1792540800018-AddReservationCommitments.ts';
import { AddPurchaseRequestCommitments1792627200019 } from '../migration/1792627200019-AddPurchaseRequestCommitments.ts';
import { AddPurchaseOrderCommitments1792713600020 } from '../migration/1792713600020-AddPurchaseOrderCommitments.ts';
import { AddReceiptCommitments1792800000021 } from '../migration/1792800000021-AddReceiptCommitments.ts';
import { BlockUnintegratedExecution1792886400022 } from '../migration/1792886400022-BlockUnintegratedExecution.ts';
import { TrustedRecipePublication1792972800023 } from '../migration/1792972800023-TrustedRecipePublication.ts';
import { TrustedWorkOrderAuthority1793059200024 } from '../migration/1793059200024-TrustedWorkOrderAuthority.ts';
import { AddFinishedOutputCustody1793059200025 } from '../migration/1793059200025-AddFinishedOutputCustody.ts';
import { TrustedPackingCustody1793059200026 } from '../migration/1793059200026-TrustedPackingCustody.ts';
import { TrustedDispatchCustody1793145600027 } from '../migration/1793145600027-TrustedDispatchCustody.ts';
import { TrustedProjectClosure1793145600028 } from '../migration/1793145600028-TrustedProjectClosure.ts';
import { HistoricalEvidenceDecisions1793232000029 } from '../migration/1793232000029-HistoricalEvidenceDecisions.ts';
import { OperationalEvidence1793232000030 } from '../migration/1793232000030-OperationalEvidence.ts';
import { AggregateWorkOrderDemand1793232000031 } from '../migration/1793232000031-AggregateWorkOrderDemand.ts';
import { BlockResidualProjectHolds1793232000032 } from '../migration/1793232000032-BlockResidualProjectHolds.ts';

const implementations: Record<string, new () => MigrationInterface> = {
  Init1689500000000,
  AddOrgAuditOrdersInvoices1689500000001,
  SeedDefaultOrganization1689500000002,
  AlignEntitiesAndSchema1689500000003,
  CleanSchemaAlignment1689500000004,
  FinalSchemaReconciliation1689500000005,
  SeedAdminUser1689500000006,
  AddVisualWarehouseAndSerialNumbers1689500000007,
  ProductionReconciliation1689500000007,
  AddStockLedgerAndWmsOps1689500000008,
  AddRbacAndSessions1689500000009,
  EnterpriseMultiLocationAndAuditCore1689500000010,
  AddQmsAndESignatures1689500000011,
  AddOrderFulfillmentFields1689500000012,
  AddHardwareElectronicsBOM1689500000013,
  AddStockIntegrityAndSpatialTree1689500000014,
  AddReservedQuantity1689500000015,
  AddProductTemplates1791417600000,
  AddKitSubjectsAndGrades1791417600001,
  AddProjectPlanning1791417600002,
  AddPhysicalStocktake1791504000003,
  AddReservationsAndProcurement1791676800004,
  AddProductionPlanning1791763200005,
  HardenProductionReconciliation1791763200006,
  AddPacking1791849600007,
  HardenPackingReadiness1791936000008,
  AddDeliveryCustody1792022400009,
  AddProjectCompletion1792108800010,
  AddPrivateAttachments1792195200011,
  AddSharedLabelLayouts1792281600012,
  AddRequirementApproval1792368000013,
  HardenApprovedPackingDemand1792454400014,
  AddCommitmentLedger1792540800015,
  HardenCommitmentEventEvidence1792540800016,
  AddLedgerCapabilities1792540800017,
  AddReservationCommitments1792540800018,
  AddPurchaseRequestCommitments1792627200019,
  AddPurchaseOrderCommitments1792713600020,
  AddReceiptCommitments1792800000021,
  BlockUnintegratedExecution1792886400022,
  TrustedRecipePublication1792972800023,
  TrustedWorkOrderAuthority1793059200024,
  AddFinishedOutputCustody1793059200025,
  TrustedPackingCustody1793059200026,
  TrustedDispatchCustody1793145600027,
  TrustedProjectClosure1793145600028,
  HistoricalEvidenceDecisions1793232000029,
  OperationalEvidence1793232000030,
  AggregateWorkOrderDemand1793232000031,
  BlockResidualProjectHolds1793232000032,
  FabLabLoans1793232000033,
};
// The manifest alone defines order; no glob loading or environment-dependent subset.
export const registeredMigrations = migrationManifest.map(entry => {
  const implementation = implementations[entry.name];
  if (!implementation) throw new Error('Missing migration implementation');
  return implementation;
});
