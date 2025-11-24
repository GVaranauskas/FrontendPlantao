import { n8nIntegrationService } from "./services/n8n-integration-service";

async function testN8NIntegration() {
  console.log("\n" + "=".repeat(60));
  console.log("🧪 TESTE DE INTEGRAÇÃO N8N");
  console.log("=".repeat(60) + "\n");

  try {
    // 1. Buscar evoluções
    console.log("📥 Buscando evoluções da enfermaria 10A02...\n");
    const startTime = Date.now();
    const evolucoes = await n8nIntegrationService.fetchEvolucoes("10A02");
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!evolucoes || evolucoes.length === 0) {
      console.log("⚠️  Nenhum registro recebido da API N8N");
      console.log(`⏱️  Tempo de resposta: ${duration}ms\n`);
      return;
    }

    // 2. Mostrar quantidade de registros
    console.log("✅ Registros recebidos com sucesso!");
    console.log(`📊 Total: ${evolucoes.length} paciente(s)`);
    console.log(`⏱️  Tempo de resposta: ${duration}ms\n`);

    // 3. Processar e mostrar primeiro paciente
    console.log("👤 Dados do Primeiro Paciente:");
    console.log("-".repeat(60));

    const primeiroPaciente = evolucoes[0];
    
    // Tentar extrair informações
    const leito = primeiroPaciente.leito || "N/A";
    const nome = primeiroPaciente.nome || primeiroPaciente.paciente_nome || "N/A";
    const diagnostico = primeiroPaciente.diagnostico || primeiroPaciente.diagnostico_comorbidades || "N/A";
    const registro = primeiroPaciente.registro || primeiroPaciente.pt_code || "N/A";
    const especialidade = primeiroPaciente.especialidade || primeiroPaciente.specialty || "N/A";
    const mobilidade = primeiroPaciente.mobilidade || "N/A";
    const dataNascimento = primeiroPaciente.data_nascimento || primeiroPaciente.dataNascimento || "N/A";

    console.log(`  🏥 Leito: ${leito}`);
    console.log(`  👥 Nome: ${nome}`);
    console.log(`  🔍 Registro: ${registro}`);
    console.log(`  🏷️  Especialidade: ${especialidade}`);
    console.log(`  📋 Diagnóstico: ${diagnostico}`);
    console.log(`  🚶 Mobilidade: ${mobilidade}`);
    console.log(`  🎂 Data Nascimento: ${dataNascimento}`);

    // 4. Tentar processar o paciente
    console.log("\n" + "-".repeat(60));
    console.log("🔄 Validando Dados do Paciente...\n");

    try {
      const processado = await n8nIntegrationService.processEvolucao(leito, primeiroPaciente);
      
      console.log("✅ Validação Concluída!");
      console.log(`  📦 Nome Processado: ${processado.dadosProcessados.nome}`);
      console.log(`  🔗 Registro: ${processado.registro}`);
      console.log(`  🏥 Data Internação: ${processado.dadosProcessados.dataInternacao}`);
      console.log(`  🚶 Mobilidade: ${processado.dadosProcessados.mobilidade}`);
      console.log(`  📋 Diagnóstico: ${processado.dadosProcessados.diagnosticoComorbidades}`);
      
      if (processado.erros.length > 0) {
        console.log("\n⚠️  Avisos de Validação:");
        processado.erros.forEach((erro, idx) => {
          console.log(`  ${idx + 1}. ${erro}`);
        });
      } else {
        console.log("\n  ✨ Sem erros de validação!");
      }
    } catch (processError) {
      console.log("❌ Erro ao processar paciente:");
      console.log(`  ${processError instanceof Error ? processError.message : String(processError)}`);
    }

    // 5. Resumo
    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMO DO TESTE");
    console.log("=".repeat(60));
    console.log(`✅ Status: SUCESSO`);
    console.log(`📥 Registros Recebidos: ${evolucoes.length}`);
    console.log(`⏱️  Tempo Total: ${duration}ms`);
    console.log(`🎯 Primeiro Paciente: ${nome} (Leito ${leito})`);
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.log("=".repeat(60));
    console.log("❌ ERRO DURANTE O TESTE");
    console.log("=".repeat(60));
    
    if (error instanceof Error) {
      console.log(`\n🔴 Erro: ${error.message}`);
      console.log(`\n📍 Stack Trace:\n${error.stack}`);
    } else {
      console.log(`\n🔴 Erro: ${String(error)}`);
    }
    
    console.log("\n💡 Possíveis Causas:");
    console.log("  • API N8N indisponível ou offline");
    console.log("  • Erro de conexão de rede");
    console.log("  • Payload inválido");
    console.log("  • Timeout na requisição");
    console.log("\n" + "=".repeat(60) + "\n");
    process.exit(1);
  }
}

// Executar teste
testN8NIntegration().catch((error) => {
  console.error("Erro não capturado:", error);
  process.exit(1);
});
