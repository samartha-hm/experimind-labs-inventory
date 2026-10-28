import type { EvidenceLane, EvidenceRow, IssueKind } from '../materialReconciliation';

/** Detached diagnostic snapshots only: no database mutation or invented transfer/discharge event. */
const lane = (source:string,rows:EvidenceRow[]):EvidenceLane=>({source,rows,available:true,truncated:false});
const account = (extra:EvidenceRow={}):EvidenceRow=>({id:'procurement-A',dimension:'material',site_id:'school-A',unit:'kg',approved:'10',fulfilled:'0',held:'10',claim_held:'10',unallocated:'0',...extra});
export const reconciliationFixtures:{name:string;lanes:EvidenceLane[];expected:IssueKind[]}[] = [
  {name:'fully received unused',lanes:[lane('accounts',[account()]),lane('receipts',[{id:'receipt-A',status:'accepted',quantity:'10',unit:'kg'}])],expected:['unresolved disposition']},
  {name:'partial receipts and QC rejection',lanes:[lane('accounts',[account()]),lane('receipts',[{id:'accepted',status:'accepted',quantity:'4',unit:'kg'},{id:'rejected',status:'rejected',quantity:'2',unit:'kg'},{id:'pending',status:'pending',quantity:'1',unit:'kg'},{id:'quarantine',status:'quarantined',quantity:'1',unit:'kg'}])],expected:['unresolved disposition']},
  {name:'issue without approved ownership link',lanes:[lane('accounts',[account()]),lane('issues',[{id:'issue-A',quantity:'3',unit:'kg',ledger_id:'physical-debit-witness'}])],expected:['unapproved transfer authority','unresolved disposition']},
  {name:'shared SKU across schools',lanes:[lane('accounts',[account({selector:{item:'shared',grade:'8',subject:'Science'}}),account({id:'procurement-B',site_id:'school-B',selector:{item:'shared',grade:'9',subject:'Science'},unit:'pcs'})])],expected:['unresolved disposition']},
  {name:'partial delivery retains output hold',lanes:[lane('accounts',[account({id:'output',unit:'output-unit',obligation:'production_output'}),account({id:'school',dimension:'slot',unit:'deliverable',approved:'2',fulfilled:'1',held:'1',claim_held:'1'})])],expected:['incomplete delivery','unresolved disposition']},
  {name:'cancellation after partial issue',lanes:[lane('accounts',[account()]),lane('issues',[{id:'issue-cancel',quantity:'3',unit:'kg'}]),lane('work_orders',[{id:'cancel-request',status:'cancelled',notes:'Disposition not approved'}])],expected:['unapproved transfer authority','unresolved disposition']},
  {name:'duplicate source coverage',lanes:[lane('coverage',[{id:'po-A',claim_id:'claim',source_slice:'line',start_quantity:'0',end_quantity:'3'},{id:'po-B',claim_id:'claim',source_slice:'line',start_quantity:'2',end_quantity:'4'}])],expected:['conflicting claims']},
  {name:'residual claim missing balance cache',lanes:[lane('accounts',[account({approved:null,fulfilled:null,held:null,unallocated:null})])],expected:['missing provenance','unresolved disposition']},
  {name:'historical unsupported provenance',lanes:[lane('reconciliation_cases',[{id:'historical-A',active:false,source_hash:'immutable-historical-hash'}])],expected:['missing provenance']},
];
