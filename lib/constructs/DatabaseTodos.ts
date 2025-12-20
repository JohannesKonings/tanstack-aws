import { AttributeType, BillingMode, Table } from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class DatabaseTodos extends Construct {
  public readonly dbTodos: Table;
  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.dbTodos = new Table(this, 'Todos', {
      partitionKey: { name: 'pk', type: AttributeType.STRING },
      sortKey: { name: 'sk', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
  }
}
